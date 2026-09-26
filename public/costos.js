const CONFIG_ENDPOINT = "/api/config/shell";
const COSTS_ENDPOINT = "/api/costos-config";
const PRESENTATION_KEY = "costos";
const COSTS_FALLBACK_STORAGE_KEY = "erp-costos-config";
const DEFAULT_FLOATING_SAVE_ICON = "\u{1F4BE}";
const PROCESS_DEFAULTS = [
    { key: "macula", label: "Merma", active: true, createEnabled: true, locked: true, repeatable: false, visibleBotonFlotante: true, order: 5 },
    { key: "troquel", label: "Troquel", active: true, createEnabled: false, locked: true, repeatable: false, visibleBotonFlotante: true, order: 10 },
    { key: "sustrato", label: "Sustrato", active: true, createEnabled: false, locked: true, repeatable: false, visibleBotonFlotante: true, order: 20 },
    { key: "diseno", label: "Dise\u00f1o", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 30 },
    { key: "preprensa", label: "Preprensa", active: true, createEnabled: true, locked: true, repeatable: false, visibleBotonFlotante: true, order: 40 },
    { key: "sellos", label: "Sellos", active: false, createEnabled: false, locked: false, repeatable: false, visibleBotonFlotante: true, order: 50 },
    { key: "impresion", label: "Impresi\u00f3n", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 60 },
    { key: "barnizado", label: "Barnizado", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 69 },
    { key: "laminado", label: "Laminado", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 70 },
    { key: "estampado", label: "Estampado", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 71 },
    { key: "embosado", label: "Embosado", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 72 },
    { key: "troquelado", label: "Troquelado", active: false, createEnabled: false, locked: false, repeatable: false, visibleBotonFlotante: true, order: 73 },
    { key: "rebobinado", label: "Rebobinado", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 74 },
    { key: "empaque", label: "Empaque", active: false, createEnabled: true, locked: false, repeatable: false, visibleBotonFlotante: true, order: 80 },
    { key: "adicionales", label: "Procesos adicionales", active: false, createEnabled: false, locked: false, repeatable: false, visibleBotonFlotante: true, order: 90 }
];

const DEFAULT_ACABADOS_BARNIZ = [
    { id: "acab-barniz-1", nombre: "Barniz UV Brillante", bcmAnilox: 7, porcentajeCobertura: 100, costoPorKilo: 12, visc: 18, potencia: 100, temp: 85 }
];

const DEFAULT_ACABADOS_LAMINADO = [
    { id: "acab-laminado-1", nombre: "Laminado Brillante", costoPorMetroLineal: 0.16, tiempoMontaje: 10 }
];

const DEFAULT_ACABADOS_ESTAMPADO = [
    { id: "acab-estampado-1", tipoFoil: "Foil Dorado", costoPorMetroLineal: 0.26, tiempoMontaje: 15 }
];

const DEFAULT_ACABADOS_CAJAS = [
    { id: "acab-caja-1", nombre: "Caja Estándar", costoPorCaja: 0.5, largoInternoCm: 0, anchoInternoCm: 0, altoInternoCm: 0 }
];

const DEFAULT_ACABADOS_BOLSAS = [
    { id: "acab-bolsa-1", nombre: "Bolsa Estándar", material: "", anchoCm: 0, largoCm: 0, capacidadCm3: 0, conManijas: false, color: "", proveedor: "", fechaCompra: "", fechaVencimiento: "", costoPorUnidad: 0 }
];

const DEFAULT_ACABADOS_COLDFOIL = {
    precioAdhesivoKg: 18,
    gramajeGm2: 2.0,
    mermaAdhesivoPct: 10,
    coberturaDefaultPct: 60
};

const DEFAULT_COSTS_CONFIG = {
    general: {
        notes: "",
        updatedAt: null,
        defaultRollWidth: 13,
        defaultCoreDiameter: 3,
        coreDiameterOptions: [
            { diametro: "1", espesor: 0, precio: 0 },
            { diametro: "1.5", espesor: 0, precio: 0 },
            { diametro: "3", espesor: 0, precio: 0 },
            { diametro: "6", espesor: 0, precio: 0 }
        ],
        defaultCantidadMotivos: 1,
        defaultLabelsPerRoll: 1000,
        adicionalCambioBobinaPct: 0,
        defaultCmykEnabled: "true",
        defaultPrepressArts: 2,
        defaultPrepressMinPerChange: 10,
        defaultPrepressHourCost: 15,
        defaultDisenoArts: 2,
        defaultDisenoHourCost: 15,
        defaultRebobinadoTiempoMontaje: 10,
        defaultRebobinadoWasteFeet: 30,
        defaultRebobinadoWastePct: 0.5,
        defaultEmpaqueCantidadXMinuto: 0,
        defaultEmpaqueMinutoHombre: 0,
        defaultEmpaqueTiempoMovilizacion: 0,
        defaultEmpaqueTiempoConfeccion: 0,
        defaultRolloCrecimientoCm: 10,
        defaultRolloCrecimientoCantidad: 1000,
        defaultMargenCajaCm: 1,
        excesoSellosIn: 0.5,
        defaultBoxCost: 0,
        defaultMarginPct: 35,
        defaultOverheadPct: 0,
        margenSaludablePct: 30,
        margenMinimoPct: 20,
        materiaPrimaMaximaPct: 55,
        defaultTaxPct: 13,
        defaultCostoPulgadaLinealTroquel: 0,
        bufferProgramacionDias: 2,
        holguraTurnoMinutos: 15,
        processDefaults: PROCESS_DEFAULTS.map((item) => ({ ...item, minimumCost: 0, timeBufferMinutes: 0, capacityMinutes: 480 }))
    },
    convencional: {
        tintaGeneral: {
            bcmGenerico: 2,
            coberturaTintaPct: 30,
            coberturaDisenoPct: 60,
            densidadUv: 1.5,
            factorTransferencia: 0.3,
            costoKgCmyk: 55.1156,
            costoKgBlanco: 66.1387,
            costoKgPantone: 77.1618,
            depositos: [
                { id: "conv-deposito-blancos", tipo: "Fondos Sólidos / Blancos", bcm: 7, coveragePct: 100, gsm: 2.5 },
                { id: "conv-deposito-textos", tipo: "Textos y Líneas Gruesas", bcm: 4, coveragePct: 10, gsm: 1.2 },
                { id: "conv-deposito-cmyk", tipo: "Policromía (CMYK)", bcm: 2, coveragePct: 25, gsm: 1 },
                { id: "conv-deposito-barniz", tipo: "Barniz UV", bcm: 7, coveragePct: 100, gsm: 3 }
            ]
        },
        inlineFinishSetup: [
            { id: "conv-inline-impresion", proceso: "Impresión", minutosPorEstacion: 5, merma_setup_metros: 0 },
            { id: "conv-inline-troquelado", proceso: "Troquelado", minutosPorEstacion: 5, merma_setup_metros: 0 },
            { id: "conv-inline-laminado", proceso: "Laminado", minutosPorEstacion: 5, merma_setup_metros: 0 },
            { id: "conv-inline-barniz", proceso: "Barniz", minutosPorEstacion: 5, merma_setup_metros: 0 },
            { id: "conv-inline-embosado", proceso: "Embosado", minutosPorEstacion: 5, merma_setup_metros: 0 },
            { id: "conv-inline-estampado", proceso: "Estampado", minutosPorEstacion: 5, merma_setup_metros: 0 },
            { id: "conv-inline-numerado", proceso: "Numerado", minutosPorEstacion: 5, merma_setup_metros: 0 }
        ],
        maculaMontaje: [
            { id: "conv-montaje-impresion", detalle: "Impresión", porEstacion: 19.812 },
            { id: "conv-montaje-troquelado", detalle: "Troquelado", porEstacion: 27.432 },
            { id: "conv-montaje-laminado", detalle: "Laminado", porEstacion: 19.812 },
            { id: "conv-montaje-barniz", detalle: "Barniz", porEstacion: 9.144 },
            { id: "conv-montaje-embosado", detalle: "Embosado", porEstacion: 19.812 }
        ],
        maculaTiraje: [
            { id: "conv-tiraje-impresion", detalle: "Impresión", porcentaje: 3 },
            { id: "conv-tiraje-impresion-troquelado", detalle: "Impresión + Troquelado", porcentaje: 4 },
            { id: "conv-tiraje-impresion-troquelado-laminado", detalle: "Impresión + Troquelado + Laminado", porcentaje: 7 },
            { id: "conv-tiraje-impresion-troquelado-laminado-embosado", detalle: "Impresión + Troquelado + Laminado + Embosado", porcentaje: 8 }
        ],
        finishWaste: [
            { id: "conv-finish-barnizado", proceso: "Barnizado", merma_setup_metros: 22.86, operationWastePct: 1.5 },
            { id: "conv-finish-laminado", proceso: "Laminado", merma_setup_metros: 30.48, operationWastePct: 2.0 },
            { id: "conv-finish-troquelado", proceso: "Troquelado", merma_setup_metros: 45.72, operationWastePct: 2.5 },
            { id: "conv-finish-estampado", proceso: "Estampado", merma_setup_metros: 76.2, operationWastePct: 4.0 },
            { id: "conv-finish-embosado", proceso: "Embosado", merma_setup_metros: 38.1, operationWastePct: 3.0 }
        ],
        costoSelloIn2: 0,
        tiempoEstandarCambioMin: 0,
        tiempoEstandarCambioVersionMin: 0,
        velocidadesImpresion: [
            { id: "conv-vel-impresion-base", condicion: "Impresión base", velocidadMpm: 80, comentario: "" },
            { id: "conv-vel-acabados", condicion: "Con acabados en línea", velocidadMpm: 80, comentario: "" },
            { id: "conv-vel-sustrato-especial", condicion: "Sustrato especial", velocidadMpm: 80, comentario: "" },
            { id: "conv-vel-gap-troquel", condicion: "Gap del troquel", velocidadMpm: 80, comentario: "" },
            { id: "conv-vel-levantamiento-troquel", condicion: "Levantamiento del troquel", velocidadMpm: 80, comentario: "" },
            { id: "conv-vel-tinta-metalica", condicion: "Tinta metálica (plata / oro)", velocidadMpm: 80, comentario: "" }
        ]
    },
    acabados: {
        barniz: DEFAULT_ACABADOS_BARNIZ.map((item) => ({ ...item })),
        laminado: DEFAULT_ACABADOS_LAMINADO.map((item) => ({ ...item })),
        estampado: DEFAULT_ACABADOS_ESTAMPADO.map((item) => ({ ...item })),
        cajas: DEFAULT_ACABADOS_CAJAS.map((item) => ({ ...item })),
        bolsas: DEFAULT_ACABADOS_BOLSAS.map((item) => ({ ...item })),
        coldfoil: { ...DEFAULT_ACABADOS_COLDFOIL }
    },
    digital: {
        premier: {
            formulaText: "Costo Premier = ((Area m2 x Consumo g/m2) / 1000 x Costo kg) + Setup Premier + Mantenimiento In-line. Si el sustrato viene pretratado, Premier = 0.",
            explanation: "El costo por metro del tratamiento offline no se define aqui como estandar general. Si la planta trata fuera de linea, ese costo operativo debe vivir en la maquina tratadora o ya venir absorbido por el sustrato pretratado.",
            comment: "Costo kg provisional tomado como referencia interna de liquido tipo coating. Si Gerencia define el SKU exacto del Primer, debe reemplazarse aqui y en los sustratos que lo usen.",
            mode: "offline",
            setupMin: 20,
            consumptionGm2: 0.65,
            costPerKg: 9.25,
            costPerM2: 0.006013,
            offlineCostPerMeter: 0,
            maintenanceCost: 14
        },
        tintaGeneral: {
            billingType: "consumo",
            costPerKg: 0,
            whiteCostPerKg: 0,
            specialCostPerKg: 0,
            clickRate: 0,
            clickMode: "por_estacion",
            coverageCmykPct: 30,
            coverageWhitePct: 100,
            cmykGm2: 1.5,
            whiteGm2: 4,
            wasteFactor: 1.1,
            specialWashCost: 18,
            formulaConsumptionText: "Costo Tinta = ((Área Total x Cobertura x Gramaje) / 1000) x Factor Merma x Costo Kg.",
            formulaClickText: "Costo Clics = Cantidad Impresiones x Estaciones Facturables x Tarifa Clic.",
            explanation: "La máquina digital puede cobrar por consumo o por clic. Estos valores funcionan como respaldo general; si la máquina tiene datos propios, la cotización usa primero los de la máquina.",
            comment: "Lavado especial provisional: referencia operativa para limpieza, purga o cambio de color especial. Debe sustituirse por el costo real de cada equipo si la planta lo define.",
            coverageProfiles: [
                { id: "digital-simple", tipo: "Simple / textos / logos", coveragePct: 15 },
                { id: "digital-estandar", tipo: "Estándar / imagen y texto", coveragePct: 30 },
                { id: "digital-complejo", tipo: "Complejo / fondo sólido", coveragePct: 90 },
                { id: "digital-blanco", tipo: "Blanco sobre transparente", coveragePct: 100 }
            ]
        },
        velocidad: {
            speedCmykMpm: 42,
            speedExtendedMpm: 26,
            comment: "Velocidades generales de respaldo. Si la máquina digital tiene sus propios metros por minuto, la cotización toma primero esos valores."
        },
        maculaMontaje: [],
        maculaTiraje: []
    }
};

const tabs = [...document.querySelectorAll(".costs-tab")];
const panels = [...document.querySelectorAll(".costs-panel")];
const saveStatus = document.getElementById("costosSaveStatus");
const generalNotes = document.getElementById("costosGeneralNotes");
const formatoNumeroPaisSelect = document.getElementById("costosFormatoNumeroPais");
formatoNumeroPaisSelect?.replaceChildren(...FORMATO_NUMERO_PAISES.map((item) => {
    const option = document.createElement("option");
    option.value = item.codigo;
    option.textContent = item.pais;
    return option;
}));
const generalDefaultFields = {
    defaultRollWidth: document.getElementById("costosDefaultRollWidth"),
    defaultCantidadMotivos: document.getElementById("costosDefaultCantidadMotivos"),
    defaultLabelsPerRoll: document.getElementById("costosDefaultLabelsPerRoll"),
    adicionalCambioBobinaPct: document.getElementById("costosAdicionalCambioBobinaPct"),
    defaultCmykEnabled: document.getElementById("costosDefaultCmykEnabled"),
    defaultPrepressArts: document.getElementById("costosDefaultPrepressArts"),
    defaultPrepressMinPerChange: document.getElementById("costosDefaultPrepressMinPerChange"),
    defaultPrepressHourCost: document.getElementById("costosDefaultPrepressHourCost"),
    defaultDisenoArts: document.getElementById("costosDefaultDisenoArts"),
    defaultDisenoHourCost: document.getElementById("costosDefaultDisenoHourCost"),
    defaultRebobinadoTiempoMontaje: document.getElementById("costosDefaultRebobinadoTiempoMontaje"),
    defaultRebobinadoWasteFeet: document.getElementById("costosDefaultRebobinadoWasteFeet"),
    defaultRebobinadoWastePct: document.getElementById("costosDefaultRebobinadoWastePct"),
    defaultEmpaqueCantidadXMinuto: document.getElementById("costosDefaultEmpaqueCantidadXMinuto"),
    defaultEmpaqueMinutoHombre: document.getElementById("costosDefaultEmpaqueMinutoHombre"),
    defaultEmpaqueTiempoMovilizacion: document.getElementById("costosDefaultEmpaqueTiempoMovilizacion"),
    defaultEmpaqueTiempoConfeccion: document.getElementById("costosDefaultEmpaqueTiempoConfeccion"),
    defaultRolloCrecimientoCm: document.getElementById("costosDefaultRolloCrecimientoCm"),
    defaultRolloCrecimientoCantidad: document.getElementById("costosDefaultRolloCrecimientoCantidad"),
    defaultMargenCajaCm: document.getElementById("costosDefaultMargenCajaCm"),
    excesoSellosIn: document.getElementById("costosExcesoSellosIn"),
    defaultBoxCost: document.getElementById("costosDefaultBoxCost"),
    defaultMarginPct: document.getElementById("costosDefaultMarginPct"),
    defaultOverheadPct: document.getElementById("costosDefaultOverheadPct"),
    margenSaludablePct: document.getElementById("costosMargenSaludablePct"),
    margenMinimoPct: document.getElementById("costosMargenMinimoPct"),
    materiaPrimaMaximaPct: document.getElementById("costosMateriaPrimaMaximaPct"),
    defaultTaxPct: document.getElementById("costosDefaultTaxPct"),
    defaultCostoPulgadaLinealTroquel: document.getElementById("costosDefaultCostoPulgadaLinealTroquel"),
    bufferProgramacionDias: document.getElementById("costosBufferProgramacionDias"),
    holguraTurnoMinutos: document.getElementById("costosHolguraTurnoMinutos")
};
const coreDiameterOptionsTableBody = document.getElementById("costosCoreDiameterOptionsTableBody");
const addCoreDiameterOptionButton = document.getElementById("costosAddCoreDiameterOption");
const processDefaultsList = document.getElementById("costosProcessDefaultsList");
const maculaMontajeTableBody = document.getElementById("maculaMontajeTableBody");
const maculaTirajeTableBody = document.getElementById("maculaTirajeTableBody");
const depositosTableBody = document.getElementById("costosDepositosTableBody");
const finishWasteTableBody = document.getElementById("costosFinishWasteTableBody");
const velocidadesTableBody = document.getElementById("costosVelocidadesTableBody");
const velocidadesAddButton = document.getElementById("costosVelocidadesAddButton");
const inlineFinishSetupTableBody = document.getElementById("inlineFinishSetupTableBody");
const digitalCoverageProfilesTableBody = document.getElementById("costosDigitalCoverageProfilesTableBody");
const acabadosBarnizTableBody = document.getElementById("costosAcabadosBarnizTableBody");
const acabadosLaminadoTableBody = document.getElementById("costosAcabadosLaminadoTableBody");
const acabadosEstampadoTableBody = document.getElementById("costosAcabadosEstampadoTableBody");
const acabadosCajasTableBody = document.getElementById("costosAcabadosCajasTableBody");
const acabadosBolsasTableBody = document.getElementById("costosAcabadosBolsasTableBody");
const acabadosBarnizAddButton = document.getElementById("costosAcabadosBarnizAddButton");
const acabadosLaminadoAddButton = document.getElementById("costosAcabadosLaminadoAddButton");
const acabadosEstampadoAddButton = document.getElementById("costosAcabadosEstampadoAddButton");
const acabadosCajasAddButton = document.getElementById("costosAcabadosCajasAddButton");
const acabadosBolsasAddButton = document.getElementById("costosAcabadosBolsasAddButton");
const costosAddTurnoButton = document.getElementById("costosAddTurnoButton");
const costosTurnosTableBody = document.getElementById("costosTurnosTableBody");
const productTypeAddButton = document.getElementById("productTypeAddButton");
const productTypesTableBody = document.getElementById("productTypesTableBody");
const productDepartmentAddButton = document.getElementById("productDepartmentAddButton");
const productDepartmentsTableBody = document.getElementById("productDepartmentsTableBody");
const coldfoilFields = {
    precioAdhesivoKg: document.getElementById("costosColdfoilPrecioKg"),
    gramajeGm2: document.getElementById("costosColdfoilGramaje"),
    mermaAdhesivoPct: document.getElementById("costosColdfoilMerma"),
    coberturaDefaultPct: document.getElementById("costosColdfoilCobertura")
};
const inkFields = {
    bcmGenerico: document.getElementById("costosBcmGenerico"),
    coberturaTintaPct: document.getElementById("costosCoberturaTinta"),
    coberturaDisenoPct: document.getElementById("costosCoberturaDiseno"),
    densidadUv: document.getElementById("costosDensidadUv"),
    factorTransferencia: document.getElementById("costosFactorTransferencia"),
    costoKgCmyk: document.getElementById("costosCostoKgCmyk"),
    costoKgBlanco: document.getElementById("costosCostoKgBlanco"),
    costoKgPantone: document.getElementById("costosCostoKgPantone")
};
const costoSelloIn2Field = document.getElementById("costosCostoSelloIn2");
const tiempoEstandarCambioMinField = document.getElementById("costosTiempoEstandarCambioMin");
const tiempoEstandarCambioVersionMinField = document.getElementById("costosTiempoEstandarCambioVersionMin");
const COST_INPUT_FORMATS = {
    costosBcmGenerico: { suffix: "BCM", maximumFractionDigits: 2 },
    costosCoberturaTinta: { suffix: "%", maximumFractionDigits: 2 },
    costosCoberturaDiseno: { suffix: "%", maximumFractionDigits: 2 },
    costosDensidadUv: { maximumFractionDigits: 2 },
    costosCostoKgCmyk: { prefix: "$", maximumFractionDigits: 2 },
    costosCostoKgBlanco: { prefix: "$", maximumFractionDigits: 2 },
    costosCostoKgPantone: { prefix: "$", maximumFractionDigits: 2 }
};
// Formatos de máscara (display-input) por id de campo fijo — Convencional (Sello).
const CONVENCIONAL_PLATE_DISPLAY_FORMATS = {
    costosCostoSelloIn2: { prefix: "$", suffix: "in²", decimales: 4 },
    costosTiempoEstandarCambioMin: { suffix: "min", decimales: 2 },
    costosTiempoEstandarCambioVersionMin: { suffix: "min", decimales: 2 },
    costosFactorTransferencia: { decimales: 2 }
};
// Formatos de máscara (display-input) por id de campo fijo — Cold Foil.
const COLDFOIL_DISPLAY_FORMATS = {
    costosColdfoilCobertura: { suffix: "%", decimales: 0 },
    costosColdfoilGramaje: { suffix: "g/m²", decimales: 1 },
    costosColdfoilMerma: { suffix: "%", decimales: 0 },
    costosColdfoilPrecioKg: { prefix: "$", suffix: "/kg", decimales: 2 }
};
// Formatos de máscara (display-input) por tabla + campo — Acabados (Barniz, Laminado, Estampado).
const ACABADOS_TABLE_DISPLAY_FORMATS = {
    barniz: {
        bcmAnilox: { decimales: 2 },
        porcentajeCobertura: { suffix: "%", decimales: 2 },
        factorTransferencia: { decimales: 2 },
        densidad: { suffix: "kg/L", decimales: 2 },
        costoPorKilo: { prefix: "$", decimales: 2 },
        visc: { suffix: "seg", decimales: 1 },
        potencia: { suffix: "%", decimales: 0 },
        temp: { suffix: "°C", decimales: 0 }
    },
    laminado: {
        costoPorMetroLineal: { prefix: "$", suffix: "/m", decimales: 2 },
        tiempoMontaje: { suffix: "min", decimales: 2 }
    },
    estampado: {
        costoPorMetroLineal: { prefix: "$", suffix: "/m", decimales: 2 },
        tiempoMontaje: { suffix: "min", decimales: 2 }
    },
    cajas: {
        costoPorCaja: { prefix: "$", suffix: "/caja", decimales: 2 },
        largoInternoCm: { suffix: "cm", decimales: 1 },
        anchoInternoCm: { suffix: "cm", decimales: 1 },
        altoInternoCm: { suffix: "cm", decimales: 1 }
    },
    bolsas: {
        anchoCm: { suffix: "cm", decimales: 1 },
        largoCm: { suffix: "cm", decimales: 1 },
        capacidadCm3: { suffix: "cm³", decimales: 1 },
        costoPorUnidad: { prefix: "$", suffix: "/unidad", decimales: 2 }
    }
};
const CONVENCIONAL_TABLE_DISPLAY_FORMATS = {
    maculaMontaje: { porEstacion: { suffix: "m", decimales: 2 } },
    maculaTiraje: { porcentaje: { suffix: "%", decimales: 0 } },
    inlineFinishSetup: { minutosPorEstacion: { suffix: "min", decimales: 1 }, merma_setup_metros: { suffix: "m", decimales: 2 } },
    depositos: { coveragePct: { suffix: "%", decimales: 0 } },
    finishWaste: { merma_setup_metros: { suffix: "m", decimales: 2 }, operationWastePct: { suffix: "%", decimales: 1 } },
    velocidadesImpresion: { velocidadMpm: { suffix: "m/min", decimales: 2 } }
};
const digitalPremierFields = {
    mode: document.getElementById("costosDigitalPremierMode"),
    setupMin: document.getElementById("costosDigitalPremierSetupMin"),
    consumptionGm2: document.getElementById("costosDigitalPremierConsumptionGm2"),
    costPerKg: document.getElementById("costosDigitalPremierCostPerKg"),
    costPerM2: document.getElementById("costosDigitalPremierCostPerM2"),
    offlineCostPerMeter: document.getElementById("costosDigitalPremierOfflineCostPerMeter"),
    maintenanceCost: document.getElementById("costosDigitalPremierMaintenanceCost"),
    comment: document.getElementById("costosDigitalPremierComment")
};
const digitalInkFields = {
    billingType: document.getElementById("costosDigitalBillingType"),
    costPerKg: document.getElementById("costosDigitalInkCostPerKg"),
    whiteCostPerKg: document.getElementById("costosDigitalWhiteInkCostPerKg"),
    specialCostPerKg: document.getElementById("costosDigitalSpecialInkCostPerKg"),
    clickRate: document.getElementById("costosDigitalClickRate"),
    clickMode: document.getElementById("costosDigitalClickMode"),
    coverageCmykPct: document.getElementById("costosDigitalCoverageCmykPct"),
    coverageWhitePct: document.getElementById("costosDigitalCoverageWhitePct"),
    cmykGm2: document.getElementById("costosDigitalCmykGm2"),
    whiteGm2: document.getElementById("costosDigitalWhiteGm2"),
    wasteFactor: document.getElementById("costosDigitalWasteFactor"),
    specialWashCost: document.getElementById("costosDigitalSpecialWashCost"),
    comment: document.getElementById("costosDigitalInkComment")
};
const digitalSpeedFields = {
    speedCmykMpm: document.getElementById("costosDigitalSpeedCmykMpm"),
    speedExtendedMpm: document.getElementById("costosDigitalSpeedExtendedMpm"),
    comment: document.getElementById("costosDigitalSpeedComment")
};
const digitalPremierFormulaText = document.getElementById("costosDigitalPremierFormulaText");
const digitalPremierExplanationText = document.getElementById("costosDigitalPremierExplanationText");
const digitalInkFormulaConsumptionText = document.getElementById("costosDigitalInkFormulaConsumptionText");
const digitalInkFormulaClickText = document.getElementById("costosDigitalInkFormulaClickText");
const digitalInkExplanationText = document.getElementById("costosDigitalInkExplanationText");

let loadedConfig = null;
let costsState = null;
let costsSaveTimer = null;
let costsSaveInFlight = false;
let costsSaveQueued = false;
let draggedProcessKey = "";

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let repaired = raw;
    for (let index = 0; index < 2; index += 1) {
        try {
            const nextValue = decodeURIComponent(escape(repaired));
            if (!nextValue || nextValue === repaired) break;
            repaired = nextValue;
        } catch (error) {
            break;
        }
    }
    return repaired.trim();
}

function numberValue(value, fallback = 0) {
const numeric = Number(value);
return Number.isFinite(numeric) ? numeric : fallback;
}

function legacyKgFromLb(lbValue, fallback) {
const lb = numberValue(lbValue, 0);
return lb > 0 ? lb / 0.45359237 : fallback;
}

function formatCostInputValue(value, format = {}) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return raw;
    const formatted = formatoNumeroApp(numeric, format.maximumFractionDigits ?? 2, { minimoDecimales: 0 });
    return `${format.prefix ? `${format.prefix} ` : ""}${formatted}${format.suffix ? ` ${format.suffix}` : ""}`.trim();
}

function syncCostInputMask(input) {
    const wrap = input?.closest?.(".costs-input-overlay");
    if (!wrap) return;
    let mask = wrap.querySelector(".costs-input-mask");
    if (!mask) {
        mask = document.createElement("span");
        mask.className = "costs-input-mask";
        wrap.appendChild(mask);
    }
    mask.textContent = formatCostInputValue(input.value, COST_INPUT_FORMATS[input.id] || {});
}

function syncCostInputMasks(root = document) {
    root.querySelectorAll(".costs-input-overlay input").forEach(syncCostInputMask);
}

function formatDisplayMaskValue(value, format = {}) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return raw;
    const formatted = formatoNumeroApp(numeric, format.decimales ?? 2);
    return `${format.prefix ? `${format.prefix} ` : ""}${formatted}${format.suffix ? ` ${format.suffix}` : ""}`.trim();
}

function syncDisplayInputMask(input, format) {
    if (!input) return;
    const mask = input.closest(".display-input-wrap")?.querySelector(".display-input-mask");
    if (!mask) return;
    mask.textContent = formatDisplayMaskValue(input.value, format || {});
}

function syncColdfoilDisplayMasks() {
    Object.keys(COLDFOIL_DISPLAY_FORMATS).forEach((id) => {
        syncDisplayInputMask(document.getElementById(id), COLDFOIL_DISPLAY_FORMATS[id]);
    });
}

function syncAcabadosTableMasks(tableBody, tableKey) {
    if (!tableBody) return;
    const formats = ACABADOS_TABLE_DISPLAY_FORMATS[tableKey];
    if (!formats) return;
    tableBody.querySelectorAll("[data-field]").forEach((input) => {
        const format = formats[input.dataset.field];
        if (format) syncDisplayInputMask(input, format);
    });
}

function syncConvencionalTableMasks(tableBody, tableKey) {
    if (!tableBody) return;
    const formats = CONVENCIONAL_TABLE_DISPLAY_FORMATS[tableKey];
    if (!formats) return;
    tableBody.querySelectorAll("[data-field]").forEach((input) => {
        const format = formats[input.dataset.field];
        if (format) syncDisplayInputMask(input, format);
    });
}

function booleanValue(value, fallback = false) {
    if (value === true || value === false) return value;
    if (value == null || value === "") return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return fallback;
}

function normalizeVelocidadesImpresion(value) {
    const fallback = DEFAULT_COSTS_CONFIG.convencional.velocidadesImpresion;
    if (!Array.isArray(value)) return fallback.map((row) => ({ ...row }));
    const items = value.map((item, index) => ({
        id: normalizeText(String(item?.id ?? "")) || `conv-vel-${index + 1}`,
        condicion: normalizeText(String(item?.condicion ?? "")),
        velocidadMpm: Math.max(0, numberValue(item?.velocidadMpm, 0)),
        comentario: normalizeText(String(item?.comentario ?? ""))
    })).filter((row) => row.condicion);
    return items.length ? items : fallback.map((row) => ({ ...row }));
}

function normalizeCoreDiameterOptions(value, fallback = DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, allowEmpty = false) {
    const normalizeOne = (item) => {
        if (item && typeof item === "object") {
            return {
                descripcion: normalizeText(String(item.descripcion ?? "")),
                diametro: normalizeText(String(item.diametro ?? "")),
                espesor: Math.max(0, numberValue(item.espesor, 0)),
                precio: Math.max(0, numberValue(item.precio, 0))
            };
        }
        const text = normalizeText(String(item ?? ""));
        return text ? { descripcion: "", diametro: text, espesor: 0, precio: 0 } : null;
    };
    if (Array.isArray(value)) {
        const items = value.map(normalizeOne).filter(Boolean);
        return items.length || allowEmpty ? items.slice(0, 5) : [...fallback];
    }
    if (value == null) return [...fallback];
    const text = normalizeText(value);
    if (!text) return allowEmpty ? [] : [...fallback];
    const items = text.split(",").map(normalizeOne).filter(Boolean);
    return items.length || allowEmpty ? items.slice(0, 5) : [...fallback];
}

function normalizeProcessDefaults(value) {
    const rows = Array.isArray(value) ? value : [];
    const fallbackByKey = Object.fromEntries(PROCESS_DEFAULTS.map((item) => [item.key, item]));
    const seen = new Set();
    const normalized = rows.map((row, index) => {
        const key = normalizeText(row?.key).toLowerCase();
        const fallback = fallbackByKey[key];
        if (!fallback || seen.has(key)) return null;
        seen.add(key);
        const locked = ["macula", "troquel"].includes(key) ? true : booleanValue(row?.locked, fallback.locked);
        const active = locked ? true : booleanValue(row?.active, fallback.active);
        const createEnabled = key === "macula" ? true : booleanValue(row?.createEnabled ?? row?.create, fallback.createEnabled);
        const repeatable = booleanValue(row?.repeatable, fallback.repeatable);
        const visibleBotonFlotante = booleanValue(row?.visibleBotonFlotante, fallback.visibleBotonFlotante);
        return {
            key,
            label: String(row?.label || "").trim() || fallback.label,
            active,
            createEnabled: active ? createEnabled : false,
            locked,
            repeatable,
            visibleBotonFlotante,
            ganttEnabled: booleanValue(row?.ganttEnabled, row?.ganttEnabled == null ? active : false),
            order: numberValue(row?.order, fallback.order ?? ((index + 1) * 10)),
            minimumCost: Math.max(0, numberValue(row?.minimumCost, 0)),
            timeBufferMinutes: Math.max(0, numberValue(row?.timeBufferMinutes ?? row?.bufferMinutes, 0)),
            capacityMinutes: Math.max(0, numberValue(row?.capacityMinutes ?? row?.capacity, 480)),
            // Programación: se conservan al guardar (antes se perdían el horario y el color).
            colorGantt: row?.colorGantt || "#378ADD",
            procesoParalelo: booleanValue(row?.procesoParalelo, false),
            terminarEnTurno: booleanValue(row?.terminarEnTurno, false),
            calendarioId: row?.calendarioId || null
        };
    }).filter(Boolean);
    PROCESS_DEFAULTS.forEach((item, index) => {
        if (seen.has(item.key)) return;
        normalized.push({
            key: item.key,
            label: item.label,
            active: item.locked ? true : item.active,
            createEnabled: item.key === "macula" ? true : Boolean(item.createEnabled && (item.locked || item.active)),
            locked: item.locked,
            repeatable: item.repeatable,
            visibleBotonFlotante: item.visibleBotonFlotante !== false,
            ganttEnabled: Boolean(item.active),
            order: item.order ?? ((index + 1) * 10),
            minimumCost: 0,
            timeBufferMinutes: 0,
            capacityMinutes: 480
        });
    });
    return normalized
        .sort((left, right) => numberValue(left.order, 999) - numberValue(right.order, 999))
        .map((item, index) => ({ ...item, order: (index + 1) * 10 }));
}

function syncProcessDefaultOrders() {
    if (!costsState?.general?.processDefaults) return;
    costsState.general.processDefaults = normalizeProcessDefaults(costsState.general.processDefaults)
        .map((item, index) => ({ ...item, order: (index + 1) * 10 }));
}

function moveProcessDefault(fromIndex, toIndex) {
    if (!costsState?.general?.processDefaults) return false;
    const rows = [...costsState.general.processDefaults];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length || fromIndex === toIndex) return false;
    const [moved] = rows.splice(fromIndex, 1);
    rows.splice(toIndex, 0, moved);
    costsState.general.processDefaults = rows.map((item, index) => ({ ...item, order: (index + 1) * 10 }));
    return true;
}

function getPresentationConfig(config, key) {
    const presentation = config?.presentations?.[key] || {};
    const general = config?.general || {};
    const layout = config?.layout || {};
    return {
        tabColor: presentation.tabColor || general.tabColor || "#7f7f7f",
        iconSize: Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20
    };
}

function normalizeFloatingSaveValue(value) {
    const raw = normalizeText(value);
    if (!raw) return DEFAULT_FLOATING_SAVE_ICON;
    if (raw.includes('\uFFFD')) return DEFAULT_FLOATING_SAVE_ICON;
    return raw;
}

function getFloatingSaveIcon(config) {
    const general = config?.general || {};
    return {
        value: normalizeFloatingSaveValue(config?.icons?.floatingSave),
        color: general.iconColorFloatingSave || "#ffffff",
        hover: general.iconColorHoverFloatingSave || "#ffffff",
        size: Number(general.iconSizeFloatingSave) || 20
    };
}

function isSvgValue(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized.startsWith("data:image/svg+xml") || /\.svg(\?|#|$)/i.test(normalized);
}

function applyFloatingSaveButtonIcon(button, iconValue, resolvedSize) {
    if (!button) return;
    const value = normalizeFloatingSaveValue(iconValue);
    if (isSvgValue(value)) {
        button.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${value}');mask-image:url('${value}');width:${resolvedSize}px;height:${resolvedSize}px;"></span>`;
        return;
    }
    if (String(value).startsWith("data:image")) {
        button.innerHTML = `<img src="${value}" alt="" class="icon-image" style="width:${resolvedSize}px;height:${resolvedSize}px;">`;
        return;
    }
    button.innerHTML = `<span class="icon-glyph">${escapeHtml(value)}</span>`;
}

function applyConfig(config) {
    loadedConfig = config || {};
    aplicarFormatoNumeroPais(loadedConfig?.general?.formatoNumeroPais);
    const root = document.documentElement;
    const presentation = getPresentationConfig(loadedConfig, PRESENTATION_KEY);
    root.style.setProperty("--tab-color", presentation.tabColor);
}

async function loadConfig() {
    const response = await fetch(CONFIG_ENDPOINT);
    if (!response.ok) throw new Error("No se pudo cargar la configuración visual.");
    applyConfig(await response.json());
}

function normalizeCostsConfig(config) {
    const source = config || {};
    const rowsOrDefault = (value, fallback = []) => (Array.isArray(value) && value.length ? value : fallback);
    const inferCoveragePct = (row) => {
        const tipo = normalizeText(row?.tipo);
        if (row?.coveragePct !== undefined && row?.coveragePct !== null && row?.coveragePct !== "") {
            return numberValue(row.coveragePct, 0);
        }
        if (tipo.includes("barniz")) return 100;
        if (tipo.includes("solidos") || tipo.includes("blancos")) return 100;
        if (tipo.includes("textos") || tipo.includes("lineas")) return 10;
        if (tipo.includes("cmyk") || tipo.includes("policromia")) return 25;
        return numberValue(source?.convencional?.tintaGeneral?.coberturaTintaPct, 0);
    };
    const normalizeDepositos = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-deposito-${index + 1}`,
        tipo: normalizeText(row?.tipo),
        bcm: numberValue(row?.bcm, 0),
        coveragePct: inferCoveragePct(row),
        gsm: numberValue(row?.gsm, 0)
    }));
    const normalizeMontaje = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-montaje-${index + 1}`,
        detalle: normalizeText(row?.detalle),
        porEstacion: numberValue(row?.porEstacion, 0)
    }));
    const normalizeTiraje = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-tiraje-${index + 1}`,
        detalle: normalizeText(row?.detalle),
        porcentaje: numberValue(row?.porcentaje, 0)
    }));
    const normalizeFinishWaste = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-finish-${index + 1}`,
        proceso: normalizeText(row?.proceso),
        merma_setup_metros: numberValue(row?.merma_setup_metros, 0),
        operationWastePct: numberValue(row?.operationWastePct, 0)
    }));
    const normalizeInlineFinishSetup = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-inline-${index + 1}`,
        proceso: normalizeText(row?.proceso),
        minutosPorEstacion: numberValue(row?.minutosPorEstacion, 5),
        merma_setup_metros: numberValue(row?.merma_setup_metros, 0)
    }));
    const normalizeDigitalCoverageProfiles = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `digital-profile-${index + 1}`,
        tipo: normalizeText(row?.tipo),
        coveragePct: numberValue(row?.coveragePct, 0)
    }));
    const normalizeAcabadosBarniz = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `acab-barniz-${index + 1}`,
        nombre: normalizeText(row?.nombre),
        bcmAnilox: numberValue(row?.bcmAnilox, 0),
        porcentajeCobertura: numberValue(row?.porcentajeCobertura, 0),
        costoPorKilo: numberValue(row?.costoPorKilo, 0),
        factorTransferencia: numberValue(row?.factorTransferencia, 0.35),
        densidad: numberValue(row?.densidad, 1.05),
        visc: numberValue(row?.visc, 18),
        potencia: numberValue(row?.potencia, 100),
        temp: numberValue(row?.temp, 85)
    }));
    const normalizeAcabadosLaminado = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `acab-laminado-${index + 1}`,
        nombre: normalizeText(row?.nombre),
        costoPorMetroLineal: numberValue(row?.costoPorMetroLineal, 0),
        tiempoMontaje: numberValue(row?.tiempoMontaje, 0)
    }));
    const normalizeAcabadosEstampado = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `acab-estampado-${index + 1}`,
        tipoFoil: normalizeText(row?.tipoFoil),
        costoPorMetroLineal: numberValue(row?.costoPorMetroLineal, 0),
        tiempoMontaje: numberValue(row?.tiempoMontaje, 0)
    }));
    const normalizeAcabadosCajas = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `acab-caja-${index + 1}`,
        nombre: normalizeText(row?.nombre),
        costoPorCaja: numberValue(row?.costoPorCaja, 0),
        largoInternoCm: numberValue(row?.largoInternoCm, 0),
        anchoInternoCm: numberValue(row?.anchoInternoCm, 0),
        altoInternoCm: numberValue(row?.altoInternoCm, 0)
    }));
    const normalizeAcabadosBolsas = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `acab-bolsa-${index + 1}`,
        nombre: normalizeText(row?.nombre),
        material: normalizeText(row?.material),
        anchoCm: numberValue(row?.anchoCm, 0),
        largoCm: numberValue(row?.largoCm, 0),
        capacidadCm3: numberValue(row?.capacidadCm3, 0),
        conManijas: row?.conManijas === true,
        color: normalizeText(row?.color),
        proveedor: normalizeText(row?.proveedor),
        fechaCompra: normalizeText(row?.fechaCompra),
        fechaVencimiento: normalizeText(row?.fechaVencimiento),
        costoPorUnidad: numberValue(row?.costoPorUnidad, 0)
    }));
    const normalizeColdfoil = (source) => {
        const cf = source || {};
        return {
            precioAdhesivoKg: numberValue(cf.precioAdhesivoKg, DEFAULT_ACABADOS_COLDFOIL.precioAdhesivoKg),
            gramajeGm2: numberValue(cf.gramajeGm2, DEFAULT_ACABADOS_COLDFOIL.gramajeGm2),
            mermaAdhesivoPct: numberValue(cf.mermaAdhesivoPct, DEFAULT_ACABADOS_COLDFOIL.mermaAdhesivoPct),
            coberturaDefaultPct: numberValue(cf.coberturaDefaultPct, DEFAULT_ACABADOS_COLDFOIL.coberturaDefaultPct)
        };
    };

    return {
        general: {
            notes: normalizeText(source?.general?.notes),
            updatedAt: source?.general?.updatedAt || null,
            defaultRollWidth: numberValue(source?.general?.defaultRollWidth, DEFAULT_COSTS_CONFIG.general.defaultRollWidth),
            defaultCoreDiameter: numberValue(source?.general?.defaultCoreDiameter, DEFAULT_COSTS_CONFIG.general.defaultCoreDiameter),
            coreDiameterOptions: normalizeCoreDiameterOptions(source?.general?.coreDiameterOptions, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true),
            defaultCantidadMotivos: Math.max(1, numberValue(source?.general?.defaultCantidadMotivos, source?.general?.defaultQuantityTypes, DEFAULT_COSTS_CONFIG.general.defaultCantidadMotivos)),
            defaultLabelsPerRoll: Math.max(1, numberValue(source?.general?.defaultLabelsPerRoll, DEFAULT_COSTS_CONFIG.general.defaultLabelsPerRoll)),
            adicionalCambioBobinaPct: Math.max(0, numberValue(source?.general?.adicionalCambioBobinaPct, DEFAULT_COSTS_CONFIG.general.adicionalCambioBobinaPct)),
            defaultCmykEnabled: String(source?.general?.defaultCmykEnabled || DEFAULT_COSTS_CONFIG.general.defaultCmykEnabled).trim().toLowerCase() === "false" ? "false" : "true",
            defaultPrepressArts: Math.max(0, numberValue(source?.general?.defaultPrepressArts, numberValue(source?.general?.defaultPrepressArtsPerHour, DEFAULT_COSTS_CONFIG.general.defaultPrepressArts))),
            defaultPrepressMinPerChange: Math.max(0, numberValue(source?.general?.defaultPrepressMinPerChange, DEFAULT_COSTS_CONFIG.general.defaultPrepressMinPerChange)),
            defaultPrepressHourCost: Math.max(0, numberValue(source?.general?.defaultPrepressHourCost, DEFAULT_COSTS_CONFIG.general.defaultPrepressHourCost)),
            defaultDisenoArts: Math.max(0, numberValue(source?.general?.defaultDisenoArts, DEFAULT_COSTS_CONFIG.general.defaultDisenoArts)),
            defaultDisenoHourCost: Math.max(0, numberValue(source?.general?.defaultDisenoHourCost, DEFAULT_COSTS_CONFIG.general.defaultDisenoHourCost)),
            defaultRebobinadoTiempoMontaje: Math.max(0, numberValue(source?.general?.defaultRebobinadoTiempoMontaje, DEFAULT_COSTS_CONFIG.general.defaultRebobinadoTiempoMontaje)),
            defaultRebobinadoWasteFeet: Math.max(0, numberValue(source?.general?.defaultRebobinadoWasteFeet, DEFAULT_COSTS_CONFIG.general.defaultRebobinadoWasteFeet)),
            defaultRebobinadoWastePct: Math.max(0, numberValue(source?.general?.defaultRebobinadoWastePct, DEFAULT_COSTS_CONFIG.general.defaultRebobinadoWastePct)),
            defaultEmpaqueCantidadXMinuto: Math.max(0, numberValue(source?.general?.defaultEmpaqueCantidadXMinuto, DEFAULT_COSTS_CONFIG.general.defaultEmpaqueCantidadXMinuto)),
            defaultEmpaqueMinutoHombre: Math.max(0, numberValue(source?.general?.defaultEmpaqueMinutoHombre, DEFAULT_COSTS_CONFIG.general.defaultEmpaqueMinutoHombre)),
            defaultEmpaqueTiempoMovilizacion: Math.max(0, numberValue(source?.general?.defaultEmpaqueTiempoMovilizacion, DEFAULT_COSTS_CONFIG.general.defaultEmpaqueTiempoMovilizacion)),
            defaultEmpaqueTiempoConfeccion: Math.max(0, numberValue(source?.general?.defaultEmpaqueTiempoConfeccion, DEFAULT_COSTS_CONFIG.general.defaultEmpaqueTiempoConfeccion)),
            defaultRolloCrecimientoCm: Math.max(0, numberValue(source?.general?.defaultRolloCrecimientoCm, DEFAULT_COSTS_CONFIG.general.defaultRolloCrecimientoCm)),
            defaultRolloCrecimientoCantidad: Math.max(1, numberValue(source?.general?.defaultRolloCrecimientoCantidad, DEFAULT_COSTS_CONFIG.general.defaultRolloCrecimientoCantidad)),
            defaultMargenCajaCm: Math.max(0, numberValue(source?.general?.defaultMargenCajaCm, DEFAULT_COSTS_CONFIG.general.defaultMargenCajaCm)),
            excesoSellosIn: Math.max(0, numberValue(source?.general?.excesoSellosIn, DEFAULT_COSTS_CONFIG.general.excesoSellosIn)),
            defaultBoxCost: Math.max(0, numberValue(source?.general?.defaultBoxCost, DEFAULT_COSTS_CONFIG.general.defaultBoxCost)),
            defaultMarginPct: Math.max(0, numberValue(source?.general?.defaultMarginPct, DEFAULT_COSTS_CONFIG.general.defaultMarginPct)),
            defaultOverheadPct: Math.max(0, numberValue(source?.general?.defaultOverheadPct, DEFAULT_COSTS_CONFIG.general.defaultOverheadPct)),
            margenSaludablePct: Math.max(0, numberValue(source?.general?.margenSaludablePct, DEFAULT_COSTS_CONFIG.general.margenSaludablePct)),
            margenMinimoPct: Math.max(0, numberValue(source?.general?.margenMinimoPct, DEFAULT_COSTS_CONFIG.general.margenMinimoPct)),
            materiaPrimaMaximaPct: Math.max(0, numberValue(source?.general?.materiaPrimaMaximaPct, DEFAULT_COSTS_CONFIG.general.materiaPrimaMaximaPct)),
            defaultTaxPct: Math.max(0, numberValue(source?.general?.defaultTaxPct, DEFAULT_COSTS_CONFIG.general.defaultTaxPct)),
            bufferProgramacionDias: Math.max(0, Math.round(numberValue(source?.general?.bufferProgramacionDias, DEFAULT_COSTS_CONFIG.general.bufferProgramacionDias))),
            holguraTurnoMinutos: Math.max(0, Math.round(numberValue(source?.general?.holguraTurnoMinutos, DEFAULT_COSTS_CONFIG.general.holguraTurnoMinutos))),
            defaultCostoPulgadaLinealTroquel: Math.max(0, numberValue(source?.general?.defaultCostoPulgadaLinealTroquel, DEFAULT_COSTS_CONFIG.general.defaultCostoPulgadaLinealTroquel)),
            processDefaults: normalizeProcessDefaults(source?.general?.processDefaults || DEFAULT_COSTS_CONFIG.general.processDefaults)
        },
        convencional: {
            tintaGeneral: {
                bcmGenerico: numberValue(source?.convencional?.tintaGeneral?.bcmGenerico, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.bcmGenerico),
                coberturaTintaPct: numberValue(source?.convencional?.tintaGeneral?.coberturaTintaPct, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaTintaPct),
                coberturaDisenoPct: numberValue(source?.convencional?.tintaGeneral?.coberturaDisenoPct, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaDisenoPct),
                densidadUv: numberValue(source?.convencional?.tintaGeneral?.densidadUv, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.densidadUv),
                factorTransferencia: numberValue(source?.convencional?.tintaGeneral?.factorTransferencia, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.factorTransferencia),
costoKgCmyk: numberValue(source?.convencional?.tintaGeneral?.costoKgCmyk, legacyKgFromLb(source?.convencional?.tintaGeneral?.costoLbCmyk, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoKgCmyk)),
    costoKgBlanco: numberValue(source?.convencional?.tintaGeneral?.costoKgBlanco, legacyKgFromLb(source?.convencional?.tintaGeneral?.costoLbBlanco, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoKgBlanco)),
    costoKgPantone: numberValue(source?.convencional?.tintaGeneral?.costoKgPantone, legacyKgFromLb(source?.convencional?.tintaGeneral?.costoLbPantone, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoKgPantone)),
                depositos: normalizeDepositos(rowsOrDefault(source?.convencional?.tintaGeneral?.depositos, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.depositos))
            },
            inlineFinishSetup: normalizeInlineFinishSetup(rowsOrDefault(source?.convencional?.inlineFinishSetup, DEFAULT_COSTS_CONFIG.convencional.inlineFinishSetup)),
            maculaMontaje: normalizeMontaje(rowsOrDefault(source?.convencional?.maculaMontaje, DEFAULT_COSTS_CONFIG.convencional.maculaMontaje)),
            maculaTiraje: normalizeTiraje(rowsOrDefault(source?.convencional?.maculaTiraje, DEFAULT_COSTS_CONFIG.convencional.maculaTiraje)),
            finishWaste: normalizeFinishWaste(rowsOrDefault(source?.convencional?.finishWaste, DEFAULT_COSTS_CONFIG.convencional.finishWaste)),
            costoSelloIn2: Math.max(0, source?.convencional?.costoSelloIn2 != null ? numberValue(source.convencional.costoSelloIn2, 0) : DEFAULT_COSTS_CONFIG.convencional.costoSelloIn2),
            tiempoEstandarCambioMin: Math.max(0, source?.convencional?.tiempoEstandarCambioMin != null ? numberValue(source.convencional.tiempoEstandarCambioMin, 0) : DEFAULT_COSTS_CONFIG.convencional.tiempoEstandarCambioMin),
            tiempoEstandarCambioVersionMin: Math.max(0, source?.convencional?.tiempoEstandarCambioVersionMin != null ? numberValue(source.convencional.tiempoEstandarCambioVersionMin, 0) : DEFAULT_COSTS_CONFIG.convencional.tiempoEstandarCambioVersionMin),
            velocidadesImpresion: normalizeVelocidadesImpresion(source?.convencional?.velocidadesImpresion)
        },
        acabados: {
            barniz: normalizeAcabadosBarniz(rowsOrDefault(source?.acabados?.barniz, DEFAULT_COSTS_CONFIG.acabados.barniz)),
            laminado: normalizeAcabadosLaminado(rowsOrDefault(source?.acabados?.laminado, DEFAULT_COSTS_CONFIG.acabados.laminado)),
            estampado: normalizeAcabadosEstampado(rowsOrDefault(source?.acabados?.estampado, DEFAULT_COSTS_CONFIG.acabados.estampado)),
            cajas: normalizeAcabadosCajas(rowsOrDefault(source?.acabados?.cajas, DEFAULT_COSTS_CONFIG.acabados.cajas)),
            bolsas: normalizeAcabadosBolsas(rowsOrDefault(source?.acabados?.bolsas, DEFAULT_COSTS_CONFIG.acabados.bolsas)),
            coldfoil: normalizeColdfoil(source?.acabados?.coldfoil)
        },
        digital: {
            premier: {
                formulaText: normalizeText(source?.digital?.premier?.formulaText) || DEFAULT_COSTS_CONFIG.digital.premier.formulaText,
                explanation: normalizeText(source?.digital?.premier?.explanation) || DEFAULT_COSTS_CONFIG.digital.premier.explanation,
                comment: normalizeText(source?.digital?.premier?.comment),
                mode: normalizeText(source?.digital?.premier?.mode) === "inline" ? "inline" : DEFAULT_COSTS_CONFIG.digital.premier.mode,
                setupMin: numberValue(source?.digital?.premier?.setupMin, DEFAULT_COSTS_CONFIG.digital.premier.setupMin),
                consumptionGm2: numberValue(source?.digital?.premier?.consumptionGm2, DEFAULT_COSTS_CONFIG.digital.premier.consumptionGm2),
                costPerKg: numberValue(source?.digital?.premier?.costPerKg, DEFAULT_COSTS_CONFIG.digital.premier.costPerKg),
                costPerM2: numberValue(source?.digital?.premier?.costPerM2, DEFAULT_COSTS_CONFIG.digital.premier.costPerM2),
                offlineCostPerMeter: numberValue(source?.digital?.premier?.offlineCostPerMeter, DEFAULT_COSTS_CONFIG.digital.premier.offlineCostPerMeter),
                maintenanceCost: numberValue(source?.digital?.premier?.maintenanceCost, DEFAULT_COSTS_CONFIG.digital.premier.maintenanceCost)
            },
            tintaGeneral: {
                billingType: normalizeText(source?.digital?.tintaGeneral?.billingType) === "clic" ? "clic" : DEFAULT_COSTS_CONFIG.digital.tintaGeneral.billingType,
                costPerKg: numberValue(source?.digital?.tintaGeneral?.costPerKg, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.costPerKg),
                whiteCostPerKg: numberValue(source?.digital?.tintaGeneral?.whiteCostPerKg, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.whiteCostPerKg),
                specialCostPerKg: numberValue(source?.digital?.tintaGeneral?.specialCostPerKg, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.specialCostPerKg),
                clickRate: numberValue(source?.digital?.tintaGeneral?.clickRate, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.clickRate),
                clickMode: normalizeText(source?.digital?.tintaGeneral?.clickMode) === "por_vuelta" ? "por_vuelta" : DEFAULT_COSTS_CONFIG.digital.tintaGeneral.clickMode,
                coverageCmykPct: numberValue(source?.digital?.tintaGeneral?.coverageCmykPct, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageCmykPct),
                coverageWhitePct: numberValue(source?.digital?.tintaGeneral?.coverageWhitePct, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageWhitePct),
                cmykGm2: numberValue(source?.digital?.tintaGeneral?.cmykGm2, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.cmykGm2),
                whiteGm2: numberValue(source?.digital?.tintaGeneral?.whiteGm2, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.whiteGm2),
                wasteFactor: numberValue(source?.digital?.tintaGeneral?.wasteFactor, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.wasteFactor),
                specialWashCost: numberValue(source?.digital?.tintaGeneral?.specialWashCost, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.specialWashCost),
                formulaConsumptionText: normalizeText(source?.digital?.tintaGeneral?.formulaConsumptionText) || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.formulaConsumptionText,
                formulaClickText: normalizeText(source?.digital?.tintaGeneral?.formulaClickText) || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.formulaClickText,
                explanation: normalizeText(source?.digital?.tintaGeneral?.explanation) || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.explanation,
                comment: normalizeText(source?.digital?.tintaGeneral?.comment),
                coverageProfiles: normalizeDigitalCoverageProfiles(rowsOrDefault(source?.digital?.tintaGeneral?.coverageProfiles, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageProfiles))
            },
            velocidad: {
                speedCmykMpm: numberValue(source?.digital?.velocidad?.speedCmykMpm, DEFAULT_COSTS_CONFIG.digital.velocidad.speedCmykMpm),
                speedExtendedMpm: numberValue(source?.digital?.velocidad?.speedExtendedMpm, DEFAULT_COSTS_CONFIG.digital.velocidad.speedExtendedMpm),
                comment: normalizeText(source?.digital?.velocidad?.comment)
            },
            maculaMontaje: normalizeMontaje(rowsOrDefault(source?.digital?.maculaMontaje, DEFAULT_COSTS_CONFIG.digital.maculaMontaje)),
            maculaTiraje: normalizeTiraje(rowsOrDefault(source?.digital?.maculaTiraje, DEFAULT_COSTS_CONFIG.digital.maculaTiraje))
        }
    };
}

function readLocalCostsConfig() {
    return normalizeCostsConfig(DEFAULT_COSTS_CONFIG);
}

function writeLocalCostsConfig(config) {
    return config;
}

let costsCalendariosList = [];
let costsProcesosMaquinasMap = {};
let costsMaquinasInventario = [];

async function loadCostsCalendarios() {
    try {
        const res = await fetch("/api/planificacion/calendarios");
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.data)) {
            costsCalendariosList = data.data;
        }
    } catch (error) {
        console.warn("No fue posible cargar calendarios en Costos:", error);
    }
}

async function loadCostsProcesosMaquinas() {
    try {
        const [resMaquinas, resInv] = await Promise.all([
            fetch("/api/costos/procesos/maquinas"),
            fetch("/api/planificacion/maquinas-inventario")
        ]);
        const dataMaquinas = await resMaquinas.json();
        const dataInv = await resInv.json();

        if (dataInv && dataInv.ok && Array.isArray(dataInv.data)) {
            costsMaquinasInventario = dataInv.data;
        }

        if (dataMaquinas && dataMaquinas.ok && Array.isArray(dataMaquinas.data)) {
            const map = {};
            dataMaquinas.data.forEach((m) => {
                const k = m.proceso_key || m.proceso_id;
                if (k) {
                    if (!map[k]) map[k] = [];
                    map[k].push(m);
                }
            });
            costsProcesosMaquinasMap = map;
        }
    } catch (e) {
        console.warn("No fue posible cargar máquinas de procesos en Costos:", e);
    }
}

async function loadCosts() {
    try {
        await Promise.all([loadCostsCalendarios(), loadCostsProcesosMaquinas()]);
        const response = await fetch(COSTS_ENDPOINT);
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
            costsState = normalizeCostsConfig(DEFAULT_COSTS_CONFIG);
            setSaveStatus("");
        } else {
            const payload = await response.json();
            costsState = normalizeCostsConfig(payload);
            setSaveStatus("");
        }
    } catch (error) {
        costsState = normalizeCostsConfig(DEFAULT_COSTS_CONFIG);
        setSaveStatus("");
    }
    renderCosts();
}

function activateTab(tabKey) {
    tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === tabKey;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.panel === tabKey);
    });
}

function renderInkFields() {
    const ink = costsState?.convencional?.tintaGeneral || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral;
    Object.entries(inkFields).forEach(([key, node]) => {
        if (node) node.value = ink[key] ?? "";
    });
    syncCostInputMasks();
    syncDisplayInputMask(inkFields.factorTransferencia, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosFactorTransferencia);
}

function renderDepositosRows() {
    const rows = costsState?.convencional?.tintaGeneral?.depositos || [];
    depositosTableBody.innerHTML = rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="tipo" value="${escapeHtml(row.tipo)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="bcm" value="${escapeHtml(row.bcm)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="coveragePct" value="${escapeHtml(row.coveragePct)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="gsm" value="${escapeHtml(row.gsm)}"></td>
        </tr>
    `).join("");
    syncConvencionalTableMasks(depositosTableBody, "depositos");
}

function renderMontajeRows() {
    const rows = costsState?.convencional?.maculaMontaje || [];
    const deleteIconHtml = getCostsIconHtml('lineDelete', '&#128465;', '#b94848', 18);
    maculaMontajeTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.maculaMontaje" data-index="${index}" data-field="detalle" value="${escapeHtml(row.detalle)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.maculaMontaje" data-index="${index}" data-field="porEstacion" value="${escapeHtml(row.porEstacion)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td style="text-align:right;"><button type="button" class="costs-row-remove" data-action="remove-montaje" data-index="${index}" aria-label="Quitar fila" title="Quitar fila">${deleteIconHtml}</button></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
    syncConvencionalTableMasks(maculaMontajeTableBody, "maculaMontaje");
}

function renderInlineFinishSetupRows() {
    const rows = costsState?.convencional?.inlineFinishSetup || [];
    inlineFinishSetupTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.inlineFinishSetup" data-index="${index}" data-field="proceso" value="${escapeHtml(row.proceso)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.inlineFinishSetup" data-index="${index}" data-field="minutosPorEstacion" value="${escapeHtml(row.minutosPorEstacion)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.inlineFinishSetup" data-index="${index}" data-field="merma_setup_metros" value="${escapeHtml(row.merma_setup_metros)}" placeholder="0"><span class="display-input-mask"></span></span></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
    syncConvencionalTableMasks(inlineFinishSetupTableBody, "inlineFinishSetup");
}

function renderTirajeRows() {
    const rows = costsState?.convencional?.maculaTiraje || [];
    const deleteIconHtml = getCostsIconHtml('lineDelete', '&#128465;', '#b94848', 18);
    maculaTirajeTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.maculaTiraje" data-index="${index}" data-field="detalle" value="${escapeHtml(row.detalle)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.maculaTiraje" data-index="${index}" data-field="porcentaje" value="${escapeHtml(row.porcentaje)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td style="text-align:right;"><button type="button" class="costs-row-remove" data-action="remove-tiraje" data-index="${index}" aria-label="Quitar fila" title="Quitar fila">${deleteIconHtml}</button></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
    syncConvencionalTableMasks(maculaTirajeTableBody, "maculaTiraje");
}

function renderFinishWasteRows() {
    const rows = costsState?.convencional?.finishWaste || [];
    finishWasteTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.finishWaste" data-index="${index}" data-field="proceso" value="${escapeHtml(row.proceso)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.finishWaste" data-index="${index}" data-field="merma_setup_metros" value="${escapeHtml(row.merma_setup_metros)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.finishWaste" data-index="${index}" data-field="operationWastePct" value="${escapeHtml(row.operationWastePct)}" placeholder="0"><span class="display-input-mask"></span></span></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
    syncConvencionalTableMasks(finishWasteTableBody, "finishWaste");
}

function renderVelocidadesImpresionRows() {
    if (!velocidadesTableBody) return;
    const rows = costsState?.convencional?.velocidadesImpresion || [];
    velocidadesTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.velocidadesImpresion" data-index="${index}" data-field="condicion" value="${escapeHtml(row.condicion)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-section="convencional.velocidadesImpresion" data-index="${index}" data-field="velocidadMpm" value="${escapeHtml(row.velocidadMpm)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><input type="text" data-section="convencional.velocidadesImpresion" data-index="${index}" data-field="comentario" value="${escapeHtml(row.comentario)}"></td>
            <td style="text-align:right;"><button type="button" class="costs-row-remove" data-action="remove-velocidad" data-index="${index}" aria-label="Quitar fila" title="Quitar fila">${getCostsIconHtml('lineDelete', '&#128465;', '#b94848', 18)}</button></td>
        </tr>
    `).join("") : '<tr><td colspan="4">No hay filas configuradas.</td></tr>';
    syncConvencionalTableMasks(velocidadesTableBody, "velocidadesImpresion");
}

function renderDigitalPremierFields() {
    const premier = costsState?.digital?.premier || DEFAULT_COSTS_CONFIG.digital.premier;
    Object.entries(digitalPremierFields).forEach(([key, node]) => {
        if (!node) return;
        node.value = premier[key] ?? "";
    });
    if (digitalPremierFormulaText) digitalPremierFormulaText.textContent = premier.formulaText || "";
    if (digitalPremierExplanationText) digitalPremierExplanationText.textContent = premier.explanation || "";
}

function renderDigitalInkFields() {
    const digitalInk = costsState?.digital?.tintaGeneral || DEFAULT_COSTS_CONFIG.digital.tintaGeneral;
    Object.entries(digitalInkFields).forEach(([key, node]) => {
        if (!node) return;
        node.value = digitalInk[key] ?? "";
    });
    if (digitalInkFormulaConsumptionText) digitalInkFormulaConsumptionText.textContent = digitalInk.formulaConsumptionText || "";
    if (digitalInkFormulaClickText) digitalInkFormulaClickText.textContent = digitalInk.formulaClickText || "";
    if (digitalInkExplanationText) digitalInkExplanationText.textContent = digitalInk.explanation || "";
}

function renderDigitalCoverageProfileRows() {
    if (!digitalCoverageProfilesTableBody) return;
    const rows = costsState?.digital?.tintaGeneral?.coverageProfiles || [];
    digitalCoverageProfilesTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="digital.tintaGeneral.coverageProfiles" data-index="${index}" data-field="tipo" value="${escapeHtml(row.tipo)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="digital.tintaGeneral.coverageProfiles" data-index="${index}" data-field="coveragePct" value="${escapeHtml(row.coveragePct)}"></td>
        </tr>
    `).join("") : '<tr><td colspan="2">No hay perfiles configurados.</td></tr>';
}

function renderDigitalSpeedFields() {
    const velocidad = costsState?.digital?.velocidad || DEFAULT_COSTS_CONFIG.digital.velocidad;
    Object.entries(digitalSpeedFields).forEach(([key, node]) => {
        if (!node) return;
        node.value = velocidad[key] ?? "";
    });
}

function renderAcabadosTable(tableBody, rows, columns) {
    if (!tableBody) return;
    if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="${columns}" class="costs-acabados-empty">No hay elementos configurados.</td></tr>`;
        return;
    }
    if (tableBody === acabadosBarnizTableBody) {
        renderAcabadosBarnizRows(rows);
    } else if (tableBody === acabadosLaminadoTableBody) {
        renderAcabadosLaminadoRows(rows);
    } else if (tableBody === acabadosEstampadoTableBody) {
        renderAcabadosEstampadoRows(rows);
    } else if (tableBody === acabadosCajasTableBody) {
        renderAcabadosCajasRows(rows);
    } else if (tableBody === acabadosBolsasTableBody) {
        renderAcabadosBolsasRows(rows);
    }
}

function renderAcabadosBarnizRows(rows) {
    if (!acabadosBarnizTableBody) return;
    const items = rows || costsState?.acabados?.barniz || [];
    if (!items.length) {
        acabadosBarnizTableBody.innerHTML = '<tr><td colspan="10" class="costs-acabados-empty">No hay barnices configurados.</td></tr>';
        return;
    }
    const deleteIconHtml = getCostsIconHtml('proformaCurrencyDelete', '&#128465;', '#b94848', 18);
    acabadosBarnizTableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td><input type="text" data-acabados-table="barniz" data-index="${index}" data-field="nombre" value="${escapeHtml(item.nombre)}" placeholder="Nombre del barniz"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="bcmAnilox" value="${escapeHtml(item.bcmAnilox)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="porcentajeCobertura" value="${escapeHtml(item.porcentajeCobertura)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="factorTransferencia" value="${escapeHtml(item.factorTransferencia)}" placeholder="0.35"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="densidad" value="${escapeHtml(item.densidad)}" placeholder="1.05"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="costoPorKilo" value="${escapeHtml(item.costoPorKilo)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="visc" value="${escapeHtml(item.visc)}" placeholder="18"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="1" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="potencia" value="${escapeHtml(item.potencia)}" placeholder="100"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="1" class="display-input" data-acabados-table="barniz" data-index="${index}" data-field="temp" value="${escapeHtml(item.temp)}" placeholder="85"><span class="display-input-mask"></span></span></td>
            <td><button type="button" class="costs-acabados-remove" data-acabados-remove="barniz" data-index="${index}" aria-label="Eliminar" title="Eliminar">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
    syncAcabadosTableMasks(acabadosBarnizTableBody, "barniz");
}

function renderAcabadosLaminadoRows(rows) {
    if (!acabadosLaminadoTableBody) return;
    const items = rows || costsState?.acabados?.laminado || [];
    if (!items.length) {
        acabadosLaminadoTableBody.innerHTML = '<tr><td colspan="4" class="costs-acabados-empty">No hay laminados configurados.</td></tr>';
        return;
    }
    const deleteIconHtml = getCostsIconHtml('proformaCurrencyDelete', '&#128465;', '#b94848', 18);
    acabadosLaminadoTableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td><input type="text" data-acabados-table="laminado" data-index="${index}" data-field="nombre" value="${escapeHtml(item.nombre)}" placeholder="Nombre del laminado"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="laminado" data-index="${index}" data-field="costoPorMetroLineal" value="${escapeHtml(item.costoPorMetroLineal)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="laminado" data-index="${index}" data-field="tiempoMontaje" value="${escapeHtml(item.tiempoMontaje)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><button type="button" class="costs-acabados-remove" data-acabados-remove="laminado" data-index="${index}" aria-label="Eliminar" title="Eliminar">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
    syncAcabadosTableMasks(acabadosLaminadoTableBody, "laminado");
}

function renderAcabadosEstampadoRows(rows) {
    if (!acabadosEstampadoTableBody) return;
    const items = rows || costsState?.acabados?.estampado || [];
    if (!items.length) {
        acabadosEstampadoTableBody.innerHTML = '<tr><td colspan="4" class="costs-acabados-empty">No hay estampados configurados.</td></tr>';
        return;
    }
    const deleteIconHtml = getCostsIconHtml('proformaCurrencyDelete', '&#128465;', '#b94848', 18);
    acabadosEstampadoTableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td><input type="text" data-acabados-table="estampado" data-index="${index}" data-field="tipoFoil" value="${escapeHtml(item.tipoFoil)}" placeholder="Tipo de foil"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="estampado" data-index="${index}" data-field="costoPorMetroLineal" value="${escapeHtml(item.costoPorMetroLineal)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="estampado" data-index="${index}" data-field="tiempoMontaje" value="${escapeHtml(item.tiempoMontaje)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><button type="button" class="costs-acabados-remove" data-acabados-remove="estampado" data-index="${index}" aria-label="Eliminar" title="Eliminar">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
    syncAcabadosTableMasks(acabadosEstampadoTableBody, "estampado");
}

function renderAcabadosCajasRows(rows) {
    if (!acabadosCajasTableBody) return;
    const items = rows || costsState?.acabados?.cajas || [];
    if (!items.length) {
        acabadosCajasTableBody.innerHTML = '<tr><td colspan="6" class="costs-acabados-empty">No hay tipos de caja configurados.</td></tr>';
        return;
    }
    const deleteIconHtml = getCostsIconHtml('proformaCurrencyDelete', '&#128465;', '#b94848', 18);
    acabadosCajasTableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td><input type="text" data-acabados-table="cajas" data-index="${index}" data-field="nombre" value="${escapeHtml(item.nombre)}" placeholder="Nombre del tipo de caja"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="cajas" data-index="${index}" data-field="costoPorCaja" value="${escapeHtml(item.costoPorCaja)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.1" class="display-input" data-acabados-table="cajas" data-index="${index}" data-field="largoInternoCm" value="${escapeHtml(item.largoInternoCm)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.1" class="display-input" data-acabados-table="cajas" data-index="${index}" data-field="anchoInternoCm" value="${escapeHtml(item.anchoInternoCm)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.1" class="display-input" data-acabados-table="cajas" data-index="${index}" data-field="altoInternoCm" value="${escapeHtml(item.altoInternoCm)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><button type="button" class="costs-acabados-remove" data-acabados-remove="cajas" data-index="${index}" aria-label="Eliminar" title="Eliminar">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
    syncAcabadosTableMasks(acabadosCajasTableBody, "cajas");
}

function renderAcabadosBolsasRows(rows) {
    if (!acabadosBolsasTableBody) return;
    const items = rows || costsState?.acabados?.bolsas || [];
    if (!items.length) {
        acabadosBolsasTableBody.innerHTML = '<tr><td colspan="12" class="costs-acabados-empty">No hay tipos de bolsa configurados.</td></tr>';
        return;
    }
    const deleteIconHtml = getCostsIconHtml('proformaCurrencyDelete', '&#128465;', '#b94848', 18);
    acabadosBolsasTableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td><input type="text" data-acabados-table="bolsas" data-index="${index}" data-field="nombre" value="${escapeHtml(item.nombre)}" placeholder="Nombre de la bolsa"></td>
            <td><input type="text" data-acabados-table="bolsas" data-index="${index}" data-field="material" value="${escapeHtml(item.material)}" placeholder="Material"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.1" class="display-input" data-acabados-table="bolsas" data-index="${index}" data-field="anchoCm" value="${escapeHtml(item.anchoCm)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.1" class="display-input" data-acabados-table="bolsas" data-index="${index}" data-field="largoCm" value="${escapeHtml(item.largoCm)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.1" class="display-input" data-acabados-table="bolsas" data-index="${index}" data-field="capacidadCm3" value="${escapeHtml(item.capacidadCm3)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td class="costs-process-default-cell-check"><label class="costs-process-default-check" aria-label="Manijas"><input type="checkbox" data-acabados-table="bolsas" data-index="${index}" data-field="conManijas"${item.conManijas ? " checked" : ""}></label></td>
            <td><input type="text" data-acabados-table="bolsas" data-index="${index}" data-field="color" value="${escapeHtml(item.color)}" placeholder="Transparente, blanca…"></td>
            <td><input type="text" data-acabados-table="bolsas" data-index="${index}" data-field="proveedor" value="${escapeHtml(item.proveedor)}" placeholder="Proveedor"></td>
            <td><input type="date" data-acabados-table="bolsas" data-index="${index}" data-field="fechaCompra" value="${escapeHtml(item.fechaCompra)}"></td>
            <td><input type="date" data-acabados-table="bolsas" data-index="${index}" data-field="fechaVencimiento" value="${escapeHtml(item.fechaVencimiento)}"></td>
            <td><span class="display-input-wrap"><input type="number" min="0" step="0.01" class="display-input" data-acabados-table="bolsas" data-index="${index}" data-field="costoPorUnidad" value="${escapeHtml(item.costoPorUnidad)}" placeholder="0"><span class="display-input-mask"></span></span></td>
            <td><button type="button" class="costs-acabados-remove" data-acabados-remove="bolsas" data-index="${index}" aria-label="Eliminar" title="Eliminar">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
    syncAcabadosTableMasks(acabadosBolsasTableBody, "bolsas");
}

function renderColdfoilFields() {
    const cf = costsState?.acabados?.coldfoil || DEFAULT_COSTS_CONFIG.acabados.coldfoil;
    Object.entries(coldfoilFields).forEach(([key, node]) => {
        if (node) node.value = cf[key] ?? "";
    });
    syncColdfoilDisplayMasks();
}

function actualizarMascaras() {
    const sufijo = (input, mascara, unidad, decimales = 2) => {
        if (!input || !mascara) return;
        const valor = String(input.value ?? "").trim();
        if (!valor) { mascara.textContent = ""; return; }
        mascara.textContent = formatoNumeroApp(valor, decimales) + (unidad ? " " + unidad : "");
    };
    const prefijo = (input, mascara, simbolo, decimales = 2) => {
        if (!input || !mascara) return;
        const valor = String(input.value ?? "").trim();
        if (!valor) { mascara.textContent = ""; return; }
        mascara.textContent = simbolo + " " + formatoNumeroApp(valor, decimales);
    };
    sufijo(document.getElementById("costosDefaultRollWidth"), document.getElementById("costosDefaultRollWidthDisplay"), "in", 2);
    sufijo(document.getElementById("costosDefaultCantidadMotivos"), document.getElementById("costosDefaultCantidadMotivosDisplay"), "", 0);
    sufijo(document.getElementById("costosDefaultLabelsPerRoll"), document.getElementById("costosDefaultLabelsPerRollDisplay"), "", 0);
    sufijo(document.getElementById("costosAdicionalCambioBobinaPct"), document.getElementById("costosAdicionalCambioBobinaPctDisplay"), "%", 2);
    prefijo(document.getElementById("costosDefaultDisenoHourCost"), document.getElementById("costosDefaultDisenoHourCostDisplay"), "$", 2);
    sufijo(document.getElementById("costosDefaultPrepressMinPerChange"), document.getElementById("costosDefaultPrepressMinPerChangeDisplay"), "min", 2);
    prefijo(document.getElementById("costosDefaultPrepressHourCost"), document.getElementById("costosDefaultPrepressHourCostDisplay"), "$", 2);
    sufijo(document.getElementById("costosDefaultRebobinadoTiempoMontaje"), document.getElementById("costosDefaultRebobinadoTiempoMontajeDisplay"), "min", 2);
    sufijo(document.getElementById("costosDefaultRebobinadoWasteFeet"), document.getElementById("costosDefaultRebobinadoWasteFeetDisplay"), "m", 2);
    sufijo(document.getElementById("costosDefaultRebobinadoWastePct"), document.getElementById("costosDefaultRebobinadoWastePctDisplay"), "%", 2);
    sufijo(document.getElementById("costosDefaultEmpaqueCantidadXMinuto"), document.getElementById("costosDefaultEmpaqueCantidadXMinutoDisplay"), "pz/h", 2);
    prefijo(document.getElementById("costosDefaultEmpaqueMinutoHombre"), document.getElementById("costosDefaultEmpaqueMinutoHombreDisplay"), "$", 2);
    sufijo(document.getElementById("costosDefaultEmpaqueTiempoMovilizacion"), document.getElementById("costosDefaultEmpaqueTiempoMovilizacionDisplay"), "min", 2);
    sufijo(document.getElementById("costosDefaultEmpaqueTiempoConfeccion"), document.getElementById("costosDefaultEmpaqueTiempoConfeccionDisplay"), "min", 2);
    sufijo(document.getElementById("costosDefaultRolloCrecimientoCm"), document.getElementById("costosDefaultRolloCrecimientoCmDisplay"), "cm", 2);
    sufijo(document.getElementById("costosDefaultRolloCrecimientoCantidad"), document.getElementById("costosDefaultRolloCrecimientoCantidadDisplay"), "unid", 0);
    sufijo(document.getElementById("costosDefaultMargenCajaCm"), document.getElementById("costosDefaultMargenCajaCmDisplay"), "cm", 2);
    sufijo(document.getElementById("costosExcesoSellosIn"), document.getElementById("costosExcesoSellosInDisplay"), "in", 2);
    prefijo(document.getElementById("costosDefaultBoxCost"), document.getElementById("costosDefaultBoxCostDisplay"), "$", 2);
    sufijo(document.getElementById("costosDefaultMarginPct"), document.getElementById("costosDefaultMarginPctDisplay"), "%", 2);
    sufijo(document.getElementById("costosDefaultOverheadPct"), document.getElementById("costosDefaultOverheadPctDisplay"), "%", 2);
    sufijo(document.getElementById("costosMargenSaludablePct"), document.getElementById("costosMargenSaludablePctDisplay"), "%", 2);
    sufijo(document.getElementById("costosMargenMinimoPct"), document.getElementById("costosMargenMinimoPctDisplay"), "%", 2);
    sufijo(document.getElementById("costosMateriaPrimaMaximaPct"), document.getElementById("costosMateriaPrimaMaximaPctDisplay"), "%", 2);
    sufijo(document.getElementById("costosDefaultTaxPct"), document.getElementById("costosDefaultTaxPctDisplay"), "%", 2);
    prefijo(document.getElementById("costosDefaultCostoPulgadaLinealTroquel"), document.getElementById("costosDefaultCostoPulgadaLinealTroquelDisplay"), "$", 2);
}

function renderCosts() {
    generalNotes.value = costsState?.general?.notes || "";
    Object.entries(generalDefaultFields).forEach(([key, node]) => {
        if (!node) return;
        if (key === "defaultCmykEnabled") {
            node.checked = String(costsState?.general?.[key] ?? DEFAULT_COSTS_CONFIG.general[key]).trim().toLowerCase() !== "false";
            return;
        }
        node.value = costsState?.general?.[key] ?? DEFAULT_COSTS_CONFIG.general[key] ?? "";
    });
    renderCoreDiameterOptionsRows();
    renderProcessDefaultRows();
    renderInkFields();
    renderDepositosRows();
    renderInlineFinishSetupRows();
    renderMontajeRows();
    renderTirajeRows();
    renderFinishWasteRows();
    renderVelocidadesImpresionRows();
    renderDigitalPremierFields();
    renderDigitalInkFields();
    renderDigitalCoverageProfileRows();
    renderDigitalSpeedFields();
    renderAcabadosBarnizRows();
    renderAcabadosLaminadoRows();
    renderAcabadosEstampadoRows();
    renderAcabadosCajasRows();
    renderAcabadosBolsasRows();
    renderColdfoilFields();
    if (costoSelloIn2Field) costoSelloIn2Field.value = costsState?.convencional?.costoSelloIn2 ?? "";
    if (tiempoEstandarCambioMinField) tiempoEstandarCambioMinField.value = costsState?.convencional?.tiempoEstandarCambioMin ?? "";
    if (tiempoEstandarCambioVersionMinField) tiempoEstandarCambioVersionMinField.value = costsState?.convencional?.tiempoEstandarCambioVersionMin ?? "";
    syncDisplayInputMask(costoSelloIn2Field, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosCostoSelloIn2);
    syncDisplayInputMask(tiempoEstandarCambioMinField, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosTiempoEstandarCambioMin);
    syncDisplayInputMask(tiempoEstandarCambioVersionMinField, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosTiempoEstandarCambioVersionMin);
    actualizarMascaras();
    if (formatoNumeroPaisSelect) formatoNumeroPaisSelect.value = loadedConfig?.general?.formatoNumeroPais || "es-CR";
}

function renderProcessDefaultRows() {
    if (!processDefaultsList) return;
    const rows = costsState?.general?.processDefaults || [];
    processDefaultsList.innerHTML = rows.map((row, index) => `
        <tr class="costs-process-default-row" data-process-default-row="${index}" data-process-key="${escapeHtml(row.key)}">
            <td class="costs-process-default-number">${index + 1}</td>
            <td>
                <div class="costs-process-default-main">
                    <button type="button" class="costs-process-default-handle" data-action="drag-process" data-index="${index}" draggable="true" aria-label="Mover proceso">⋮⋮</button>
                    <span class="costs-process-default-label">${escapeHtml(row.label)}</span>
                </div>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Activo">
                    <input type="checkbox" data-process-field="active" data-index="${index}"${row.active ? " checked" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Crear">
                    <input type="checkbox" data-process-field="createEnabled" data-index="${index}"${row.createEnabled ? " checked" : ""}${row.key === "macula" ? " disabled" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Activo en Gantt" title="Activo en Gantt: el proceso se programa">
                    <input type="checkbox" data-process-field="ganttEnabled" data-index="${index}"${row.ganttEnabled ? " checked" : ""}>
                </label>
            </td>
            <td>
                <button type="button" class="costs-btn-secondary" style="height:30px;padding:0 10px;font-size:12px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" onclick="openEditarProcesoModal(${index})">
                    ⚙️ Editar
                </button>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="No Eliminar">
                    <input type="checkbox" data-process-field="locked" data-index="${index}"${row.locked ? " checked" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Permitir repetir">
                    <input type="checkbox" data-process-field="repeatable" data-index="${index}"${row.repeatable ? " checked" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Bot\u00f3n Flotante">
                    <input type="checkbox" data-process-field="visibleBotonFlotante" data-index="${index}"${row.visibleBotonFlotante ? " checked" : ""}>
                </label>
            </td>
            <td>
                <label class="costs-process-default-cost" aria-label="Costo Mínimo">
                    <span class="costs-process-default-currency">$</span>
                    <input type="number" min="0" step="1" inputmode="numeric" data-process-field="minimumCost" data-index="${index}" value="${escapeHtml(Math.round(Number(row.minimumCost || 0)))}" placeholder="0">
                </label>
            </td>
            <td style="display:none">
                <label class="costs-process-default-cost has-suffix" aria-label="Buffer de tiempo">
                    <input type="number" min="0" step="1" inputmode="numeric" data-process-field="timeBufferMinutes" data-index="${index}" value="${escapeHtml(Math.round(Number(row.timeBufferMinutes || 0)))}" placeholder="0">
                    <span class="costs-process-default-currency costs-process-default-suffix">min</span>
                </label>
            </td>
        </tr>
    `).join("");
}

function renderCoreDiameterOptionsRows() {
    if (!coreDiameterOptionsTableBody) return;
    const rows = Array.isArray(costsState?.general?.coreDiameterOptions)
        ? costsState.general.coreDiameterOptions
        : [];
    coreDiameterOptionsTableBody.innerHTML = (rows.length ? rows : [{ diametro: "", espesor: 0, precio: 0, descripcion: "" }]).map((item, index) => `
        <tr class="costs-core-option-row">
            <td>
                <input type="text" class="costs-core-option-input" data-core-diameter-option-desc="${index}" value="${escapeHtml(item.descripcion || "")}" placeholder="Ej. Core estándar 3 pulg">
            </td>
            <td>
                <input type="text" class="costs-core-option-input" data-core-diameter-option-input="${index}" value="${escapeHtml(item.diametro || "")}" placeholder="Ej. 1.5">
            </td>
            <td>
                <span class="display-input-wrap"><input type="number" class="display-input costs-core-option-thick" data-core-option-thick="${index}" step="any" min="0" value="${numberValue(item.espesor, 0)}"><span class="display-input-mask costs-core-option-thick-mask" data-core-option-thick-mask="${index}"></span></span>
            </td>
            <td>
                <span class="display-input-wrap"><input type="number" class="display-input costs-core-option-price" data-core-option-price="${index}" step="any" min="0" value="${numberValue(item.precio, 0)}"><span class="display-input-mask costs-core-option-price-mask" data-core-option-price-mask="${index}"></span></span>
            </td>
            <td class="costs-core-option-action-cell">
                <button type="button" class="costs-option-remove" data-core-diameter-option-remove="${index}" aria-label="Quitar opción">${getCostsIconHtml('lineDelete', '&#128465;', '#b94848', 18)}</button>
            </td>
        </tr>
    `).join("");
    if (addCoreDiameterOptionButton) {
        addCoreDiameterOptionButton.disabled = rows.length >= 5;
    }
    syncCoreOptionMasks();
}

function syncCoreOptionMasks() {
    coreDiameterOptionsTableBody?.querySelectorAll("[data-core-option-thick-mask]").forEach((mask) => {
        const idx = Number(mask.dataset.coreOptionThickMask);
        const input = coreDiameterOptionsTableBody.querySelector(`[data-core-option-thick="${idx}"]`);
        const raw = input?.value ?? "";
        const val = numberValue(raw, 0);
        mask.textContent = raw ? `${formatoNumeroApp(val, 2)} mm` : "";
    });
    coreDiameterOptionsTableBody?.querySelectorAll("[data-core-option-price-mask]").forEach((mask) => {
        const idx = Number(mask.dataset.coreOptionPriceMask);
        const input = coreDiameterOptionsTableBody.querySelector(`[data-core-option-price="${idx}"]`);
        const raw = input?.value ?? "";
        const val = numberValue(raw, 0);
        mask.textContent = raw ? `$ ${formatoNumeroApp(val, 2)}` : "";
    });
}

function setSaveStatus(message, isError = false) {
    saveStatus.textContent = message;
    saveStatus.hidden = !message;
    saveStatus.classList.toggle("is-error", Boolean(isError));
}

async function saveCosts() {
    costsState.general.updatedAt = new Date().toISOString();
    setSaveStatus("Guardando...");
    const response = await fetch(COSTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(costsState)
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar la configuración de costos.");
    }
    costsState = normalizeCostsConfig(payload);
    setSaveStatus("Configuración guardada.");
}

function queueCostsSave() {
    if (!costsState) return;
    if (costsSaveInFlight) {
        costsSaveQueued = true;
        return;
    }
    clearTimeout(costsSaveTimer);
    setSaveStatus("Guardando cambios...");
    costsSaveTimer = setTimeout(async () => {
        costsSaveInFlight = true;
        try {
            await saveCosts();
        } catch (error) {
            setSaveStatus(error.message || "No se pudo guardar.", true);
        } finally {
            costsSaveInFlight = false;
            if (costsSaveQueued) {
                costsSaveQueued = false;
                queueCostsSave();
            }
        }
    }, 650);
}

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        activateTab(tab.dataset.tab);
        if (tab.dataset.tab === "tipo-cambio") {
            loadExchangeRateModule().catch((error) => {
                setExchangeRateConfigStatus(error.message || "No fue posible cargar el tipo de cambio.", "error");
            });
        }
        if (tab.dataset.tab === "inventarios-sap") {
            loadInventariosSap().catch(() => {});
        }
    });
});

generalNotes?.addEventListener("input", () => {
    if (!costsState) return;
    costsState.general.notes = generalNotes.value;
    queueCostsSave();
});

formatoNumeroPaisSelect?.addEventListener("change", async () => {
    const codigo = formatoNumeroPaisSelect.value;
    aplicarFormatoNumeroPais(codigo);
    renderCosts();
    setSaveStatus("Guardando...");
    try {
        const response = await fetch("/api/config/general", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ general: { formatoNumeroPais: codigo } })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo guardar el formato de número.");
        loadedConfig = payload;
        setSaveStatus("Configuración guardada.");
    } catch (error) {
        setSaveStatus(error.message || "No se pudo guardar el formato de número.", true);
    }
});

window.addEventListener("erp-general-config-updated", (event) => {
    loadedConfig = event.detail || loadedConfig;
    aplicarFormatoNumeroPais(loadedConfig?.general?.formatoNumeroPais);
    if (formatoNumeroPaisSelect) formatoNumeroPaisSelect.value = loadedConfig?.general?.formatoNumeroPais || "es-CR";
    renderCosts();
});

Object.entries(generalDefaultFields).forEach(([key, node]) => {
    const updateGeneralDefault = () => {
        if (!costsState) return;
        if (key === "defaultCmykEnabled") {
            costsState.general[key] = node.checked ? "true" : "false";
        } else        if (key === "defaultCantidadMotivos" || key === "defaultLabelsPerRoll" || key === "defaultRolloCrecimientoCantidad") {
            costsState.general[key] = Math.max(1, numberValue(node.value, DEFAULT_COSTS_CONFIG.general[key]));
        } else {
            costsState.general[key] = numberValue(node.value, DEFAULT_COSTS_CONFIG.general[key]);
        }
        queueCostsSave();
        actualizarMascaras();
    };
    node?.addEventListener("input", updateGeneralDefault);
    if (key === "defaultCmykEnabled") node?.addEventListener("change", updateGeneralDefault);
});

coreDiameterOptionsTableBody?.addEventListener("input", (event) => {
    if (!costsState) return;
    const descTarget = event.target.closest("[data-core-diameter-option-desc]");
    if (descTarget) {
        const index = Number(descTarget.dataset.coreDiameterOptionDesc);
        const nextRows = [...(costsState.general.coreDiameterOptions || [])];
        while (nextRows.length <= index) nextRows.push({ diametro: "", espesor: 0, precio: 0, descripcion: "" });
        const row = { ...nextRows[index] };
        row.descripcion = normalizeText(descTarget.value);
        nextRows[index] = row;
        costsState.general.coreDiameterOptions = normalizeCoreDiameterOptions(nextRows, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true);
        queueCostsSave();
        return;
    }
    const diametroTarget = event.target.closest("[data-core-diameter-option-input]");
    if (diametroTarget) {
        const index = Number(diametroTarget.dataset.coreDiameterOptionInput);
        const nextRows = [...(costsState.general.coreDiameterOptions || [])];
        while (nextRows.length <= index) nextRows.push({ diametro: "", espesor: 0, precio: 0 });
        const row = { ...nextRows[index] };
        row.diametro = normalizeText(diametroTarget.value);
        nextRows[index] = row;
        costsState.general.coreDiameterOptions = normalizeCoreDiameterOptions(nextRows, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true);
        queueCostsSave();
        return;
    }
    const thickTarget = event.target.closest("[data-core-option-thick]");
    if (thickTarget) {
        const index = Number(thickTarget.dataset.coreOptionThick);
        const nextRows = [...(costsState.general.coreDiameterOptions || [])];
        while (nextRows.length <= index) nextRows.push({ diametro: "", espesor: 0, precio: 0 });
        const row = { ...nextRows[index] };
        row.espesor = Math.max(0, numberValue(thickTarget.value, 0));
        nextRows[index] = row;
        costsState.general.coreDiameterOptions = normalizeCoreDiameterOptions(nextRows, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true);
        syncCoreOptionMasks();
        queueCostsSave();
        return;
    }
    const priceTarget = event.target.closest("[data-core-option-price]");
    if (priceTarget) {
        const index = Number(priceTarget.dataset.coreOptionPrice);
        const nextRows = [...(costsState.general.coreDiameterOptions || [])];
        while (nextRows.length <= index) nextRows.push({ diametro: "", espesor: 0, precio: 0 });
        const row = { ...nextRows[index] };
        row.precio = Math.max(0, numberValue(priceTarget.value, 0));
        nextRows[index] = row;
        costsState.general.coreDiameterOptions = normalizeCoreDiameterOptions(nextRows, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true);
        syncCoreOptionMasks();
        queueCostsSave();
        return;
    }
});

coreDiameterOptionsTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-core-diameter-option-remove]");
    if (!button || !costsState) return;
    const index = Number(button.dataset.coreDiameterOptionRemove);
    costsState.general.coreDiameterOptions = (costsState.general.coreDiameterOptions || []).filter((_, rowIndex) => rowIndex !== index);
    renderCoreDiameterOptionsRows();
    queueCostsSave();
});

processDefaultsList?.addEventListener("input", (event) => {
    const target = event.target.closest("[data-process-field]");
    if (!target || !costsState) return;
    const row = costsState.general.processDefaults?.[Number(target.dataset.index)];
    if (!row) return;
    if (target.dataset.processField === "minimumCost") {
        row.minimumCost = Math.max(0, numberValue(target.value, 0));
    }
    if (target.dataset.processField === "timeBufferMinutes") {
        row.timeBufferMinutes = Math.max(0, numberValue(target.value, 0));
    }
    if (target.dataset.processField === "capacityMinutes") {
        row.capacityMinutes = Math.max(0, numberValue(target.value, 0));
    }
    queueCostsSave();
});

processDefaultsList?.addEventListener("change", (event) => {
    const target = event.target.closest("[data-process-field]");
    if (!target || !costsState) return;
    const row = costsState.general.processDefaults?.[Number(target.dataset.index)];
    if (!row) return;
    if (target.dataset.processField === "active") {
        row.active = target.checked;
        if (!row.active) {
            row.locked = false;
            row.createEnabled = false;
        }
        if (["macula", "troquel"].includes(row.key)) {
            row.active = true;
            row.locked = true;
            if (row.key === "macula") row.createEnabled = true;
        }
    }
    if (target.dataset.processField === "createEnabled") {
        row.createEnabled = row.key === "macula" ? true : target.checked;
        if (row.createEnabled) row.active = true;
    }
    if (target.dataset.processField === "ganttEnabled") {
        row.ganttEnabled = target.checked;
    }
    if (target.dataset.processField === "colorGantt") {
        row.colorGantt = target.value;
    }
    if (target.dataset.processField === "procesoParalelo") {
        row.procesoParalelo = target.checked;
    }
    if (target.dataset.processField === "calendarioId") {
        row.calendarioId = target.value || null;
    }
    if (target.dataset.processField === "locked") {
        row.locked = target.checked;
        if (["macula", "troquel"].includes(row.key)) row.locked = true;
        if (row.locked) row.active = true;
    }
    if (target.dataset.processField === "repeatable") {
        row.repeatable = target.checked;
    }
    if (target.dataset.processField === "visibleBotonFlotante") {
        row.visibleBotonFlotante = target.checked;
    }
    syncProcessDefaultOrders();
    renderProcessDefaultRows();
    queueCostsSave();
});

processDefaultsList?.addEventListener("click", (event) => {
    const upButton = event.target.closest('[data-action="move-process-up"]');
    if (upButton && moveProcessDefault(Number(upButton.dataset.index), Number(upButton.dataset.index) - 1)) {
        renderProcessDefaultRows();
        queueCostsSave();
        return;
    }
    const downButton = event.target.closest('[data-action="move-process-down"]');
    if (downButton && moveProcessDefault(Number(downButton.dataset.index), Number(downButton.dataset.index) + 1)) {
        renderProcessDefaultRows();
        queueCostsSave();
    }
});

processDefaultsList?.addEventListener("dragstart", (event) => {
    const handle = event.target.closest('[data-action="drag-process"]');
    if (!handle) {
        event.preventDefault();
        return;
    }
    draggedProcessKey = String(handle.closest("[data-process-key]")?.dataset.processKey || "");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedProcessKey);
    handle.closest(".costs-process-default-row")?.classList.add("is-dragging");
});

processDefaultsList?.addEventListener("dragover", (event) => {
    if (!draggedProcessKey) return;
    event.preventDefault();
    const row = event.target.closest(".costs-process-default-row");
    processDefaultsList.querySelectorAll(".costs-process-default-row.is-drop-before").forEach((node) => node.classList.remove("is-drop-before"));
    if (row) row.classList.add("is-drop-before");
});

processDefaultsList?.addEventListener("drop", (event) => {
    if (!draggedProcessKey || !costsState) return;
    event.preventDefault();
    const row = event.target.closest(".costs-process-default-row");
    const fromIndex = (costsState.general.processDefaults || []).findIndex((item) => item.key === draggedProcessKey);
    const toIndex = Number(row?.dataset.processDefaultRow ?? -1);
    processDefaultsList.querySelectorAll(".costs-process-default-row").forEach((node) => node.classList.remove("is-drop-before", "is-dragging"));
    draggedProcessKey = "";
    if (moveProcessDefault(fromIndex, toIndex)) {
        renderProcessDefaultRows();
        queueCostsSave();
    }
});

processDefaultsList?.addEventListener("dragend", () => {
    processDefaultsList.querySelectorAll(".costs-process-default-row").forEach((node) => node.classList.remove("is-drop-before", "is-dragging"));
    draggedProcessKey = "";
});

addCoreDiameterOptionButton?.addEventListener("click", () => {
    if (!costsState) return;
    const nextRows = [...(costsState.general.coreDiameterOptions || [])];
    if (nextRows.length >= 5) return;
    nextRows.push({ diametro: "", espesor: 0, precio: 0 });
    costsState.general.coreDiameterOptions = nextRows;
    renderCoreDiameterOptionsRows();
});

Object.entries(inkFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.convencional.tintaGeneral[key] = numberValue(node.value, 0);
        if (key === "factorTransferencia") syncDisplayInputMask(node, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosFactorTransferencia);
        else syncCostInputMask(node);
        queueCostsSave();
    });
});

costoSelloIn2Field?.addEventListener("input", () => {
    if (!costsState) return;
    costsState.convencional.costoSelloIn2 = numberValue(costoSelloIn2Field.value, 0);
    syncDisplayInputMask(costoSelloIn2Field, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosCostoSelloIn2);
    queueCostsSave();
});

tiempoEstandarCambioMinField?.addEventListener("input", () => {
    if (!costsState) return;
    costsState.convencional.tiempoEstandarCambioMin = numberValue(tiempoEstandarCambioMinField.value, 0);
    syncDisplayInputMask(tiempoEstandarCambioMinField, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosTiempoEstandarCambioMin);
    queueCostsSave();
});

tiempoEstandarCambioVersionMinField?.addEventListener("input", () => {
    if (!costsState) return;
    costsState.convencional.tiempoEstandarCambioVersionMin = numberValue(tiempoEstandarCambioVersionMinField.value, 0);
    syncDisplayInputMask(tiempoEstandarCambioVersionMinField, CONVENCIONAL_PLATE_DISPLAY_FORMATS.costosTiempoEstandarCambioVersionMin);
    queueCostsSave();
});

depositosTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.tintaGeneral.depositos"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.tintaGeneral.depositos[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    syncConvencionalTableMasks(depositosTableBody, "depositos");
    queueCostsSave();
});

inlineFinishSetupTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.inlineFinishSetup"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.inlineFinishSetup[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    syncConvencionalTableMasks(inlineFinishSetupTableBody, "inlineFinishSetup");
    queueCostsSave();
});

maculaMontajeTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.maculaMontaje"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.maculaMontaje[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    syncConvencionalTableMasks(maculaMontajeTableBody, "maculaMontaje");
    queueCostsSave();
});

maculaTirajeTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.maculaTiraje"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.maculaTiraje[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    syncConvencionalTableMasks(maculaTirajeTableBody, "maculaTiraje");
    queueCostsSave();
});

finishWasteTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.finishWaste"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.finishWaste[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    syncConvencionalTableMasks(finishWasteTableBody, "finishWaste");
    queueCostsSave();
});

maculaMontajeTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="remove-montaje"]');
    if (!button || !costsState) return;
    costsState.convencional.maculaMontaje.splice(Number(button.dataset.index), 1);
    renderMontajeRows();
    queueCostsSave();
});

maculaTirajeTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="remove-tiraje"]');
    if (!button || !costsState) return;
    costsState.convencional.maculaTiraje.splice(Number(button.dataset.index), 1);
    renderTirajeRows();
    queueCostsSave();
});

velocidadesTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.velocidadesImpresion"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.velocidadesImpresion[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    syncConvencionalTableMasks(velocidadesTableBody, "velocidadesImpresion");
    queueCostsSave();
});

velocidadesTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="remove-velocidad"]');
    if (!button || !costsState) return;
    costsState.convencional.velocidadesImpresion.splice(Number(button.dataset.index), 1);
    renderVelocidadesImpresionRows();
    queueCostsSave();
});

velocidadesAddButton?.addEventListener("click", () => {
    if (!costsState) return;
    if (!Array.isArray(costsState.convencional.velocidadesImpresion)) costsState.convencional.velocidadesImpresion = [];
    costsState.convencional.velocidadesImpresion.push({ id: `conv-vel-${Date.now()}`, condicion: "", velocidadMpm: 80, comentario: "" });
    renderVelocidadesImpresionRows();
    queueCostsSave();
});

document.querySelectorAll(".costs-subtab").forEach((subtab) => {
    subtab.addEventListener("click", () => {
        const key = subtab.dataset.subtab;
        document.querySelectorAll(".costs-subtab").forEach((node) => {
            const isActive = node.dataset.subtab === key;
            node.classList.toggle("is-active", isActive);
            node.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        document.querySelectorAll(".costs-subpanel").forEach((panel) => {
            panel.classList.toggle("is-active", panel.dataset.subpanel === key);
        });
    });
});

Object.entries(digitalPremierFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.digital.premier[key] = node.tagName === "TEXTAREA" || node.tagName === "SELECT"
            ? node.value
            : numberValue(node.value, DEFAULT_COSTS_CONFIG.digital.premier[key]);
        queueCostsSave();
    });
});

Object.entries(digitalInkFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.digital.tintaGeneral[key] = node.tagName === "TEXTAREA" || node.tagName === "SELECT"
            ? node.value
            : numberValue(node.value, DEFAULT_COSTS_CONFIG.digital.tintaGeneral[key]);
        queueCostsSave();
    });
});

Object.entries(digitalSpeedFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.digital.velocidad[key] = node.tagName === "TEXTAREA"
            ? node.value
            : numberValue(node.value, DEFAULT_COSTS_CONFIG.digital.velocidad[key]);
        queueCostsSave();
    });
});

digitalCoverageProfilesTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="digital.tintaGeneral.coverageProfiles"]');
    if (!target || !costsState) return;
    const row = costsState.digital.tintaGeneral.coverageProfiles[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

function getAcabadosArray(tableKey) {
    if (tableKey === "barniz") return costsState.acabados.barniz;
    if (tableKey === "laminado") return costsState.acabados.laminado;
    if (tableKey === "estampado") return costsState.acabados.estampado;
    if (tableKey === "cajas") return costsState.acabados.cajas;
    if (tableKey === "bolsas") return costsState.acabados.bolsas;
    return null;
}

function setAcabadosArray(tableKey, arr) {
    if (tableKey === "barniz") costsState.acabados.barniz = arr;
    else if (tableKey === "laminado") costsState.acabados.laminado = arr;
    else if (tableKey === "estampado") costsState.acabados.estampado = arr;
    else if (tableKey === "cajas") costsState.acabados.cajas = arr;
    else if (tableKey === "bolsas") costsState.acabados.bolsas = arr;
}

function renderAcabadosByTable(tableKey) {
    if (tableKey === "barniz") renderAcabadosBarnizRows();
    else if (tableKey === "laminado") renderAcabadosLaminadoRows();
    else if (tableKey === "estampado") renderAcabadosEstampadoRows();
    else if (tableKey === "cajas") renderAcabadosCajasRows();
    else if (tableKey === "bolsas") renderAcabadosBolsasRows();
}

document.addEventListener("input", (event) => {
    const target = event.target.closest("[data-acabados-table]");
    if (!target || !costsState) return;
    const tableKey = target.dataset.acabadosTable;
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    const arr = getAcabadosArray(tableKey);
    if (!arr || !arr[index]) return;
    arr[index][field] = target.type === "checkbox" ? target.checked : (target.type === "number" ? numberValue(target.value, 0) : target.value);
    syncDisplayInputMask(target, ACABADOS_TABLE_DISPLAY_FORMATS[tableKey]?.[field]);
    queueCostsSave();
});

document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-acabados-remove]");
    if (!button || !costsState) return;
    const tableKey = button.dataset.acabadosRemove;
    const index = Number(button.dataset.index);
    const arr = getAcabadosArray(tableKey);
    if (!arr || index < 0 || index >= arr.length) return;
    arr.splice(index, 1);
    renderAcabadosByTable(tableKey);
    queueCostsSave();
});

acabadosBarnizAddButton?.addEventListener("click", () => {
    if (!costsState) return;
    costsState.acabados.barniz.push({ id: `acab-barniz-${Date.now()}`, nombre: "", bcmAnilox: 0, porcentajeCobertura: 0, costoPorKilo: 0, factorTransferencia: 0.35, densidad: 1.05, visc: 18, potencia: 100, temp: 85 });
    renderAcabadosBarnizRows();
    queueCostsSave();
});

acabadosLaminadoAddButton?.addEventListener("click", () => {
    if (!costsState) return;
    costsState.acabados.laminado.push({ id: `acab-laminado-${Date.now()}`, nombre: "", costoPorMetroLineal: 0, tiempoMontaje: 0 });
    renderAcabadosLaminadoRows();
    queueCostsSave();
});

Object.entries(coldfoilFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        if (!costsState.acabados.coldfoil) costsState.acabados.coldfoil = { ...DEFAULT_ACABADOS_COLDFOIL };
        costsState.acabados.coldfoil[key] = numberValue(node.value, DEFAULT_ACABADOS_COLDFOIL[key]);
        syncDisplayInputMask(node, COLDFOIL_DISPLAY_FORMATS[node.id]);
        queueCostsSave();
    });
});

acabadosEstampadoAddButton?.addEventListener("click", () => {
    if (!costsState) return;
    costsState.acabados.estampado.push({ id: `acab-estampado-${Date.now()}`, tipoFoil: "", costoPorMetroLineal: 0, tiempoMontaje: 0 });
    renderAcabadosEstampadoRows();
    queueCostsSave();
});

acabadosCajasAddButton?.addEventListener("click", () => {
    if (!costsState) return;
    costsState.acabados.cajas.push({ id: `acab-caja-${Date.now()}`, nombre: "", costoPorCaja: 0, largoInternoCm: 0, anchoInternoCm: 0, altoInternoCm: 0 });
    renderAcabadosCajasRows();
    queueCostsSave();
});

acabadosBolsasAddButton?.addEventListener("click", () => {
    if (!costsState) return;
    costsState.acabados.bolsas.push({ id: `acab-bolsa-${Date.now()}`, nombre: "", material: "", anchoCm: 0, largoCm: 0, capacidadCm3: 0, conManijas: false, color: "", proveedor: "", fechaCompra: "", fechaVencimiento: "", costoPorUnidad: 0 });
    renderAcabadosBolsasRows();
    queueCostsSave();
});

function getCostsIconHtml(iconKey, fallbackText, fallbackColor, fallbackSize) {
    const value = loadedConfig?.icons?.[iconKey] || fallbackText;
    const suffix = String(iconKey || '').split(/[.\s_-]+/).filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const color = loadedConfig?.general?.[`iconColor${suffix}`] || fallbackColor;
    const size = Number(loadedConfig?.general?.[`iconSize${suffix}`]) || fallbackSize;
    if (value && String(value).startsWith('data:image/svg')) {
        return `<img src="${value}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;" alt="">`;
    }
    if (value && String(value).startsWith('data:image')) {
        return `<img src="${value}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;">`;
    }
    if (value && /^\/|https?:\/\//i.test(String(value))) {
        return `<img src="${escapeHtml(value)}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;">`;
    }
    return `<span style="color:${color};font-size:${size}px;vertical-align:middle;display:inline-block;line-height:1;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif;">${value}&#xFE0F;</span>`;
}

function renderAcabadosAddButtonIcons() {
    [
        { btn: acabadosBarnizAddButton },
        { btn: acabadosLaminadoAddButton },
        { btn: acabadosEstampadoAddButton },
        { btn: acabadosCajasAddButton },
        { btn: acabadosBolsasAddButton }
    ].forEach(({ btn }) => {
        if (btn) btn.innerHTML = getCostsIconHtml('proformaCurrencyAdd', '+', '#738196', 20);
    });
    if (addCoreDiameterOptionButton) {
        addCoreDiameterOptionButton.innerHTML = getCostsIconHtml('proformaCurrencyAdd', '+', '#738196', 20);
    }
    if (costosAddTurnoButton) {
        costosAddTurnoButton.innerHTML = getCostsIconHtml('proformaCurrencyAdd', '+', '#738196', 20);
    }
    if (productTypeAddButton) {
        productTypeAddButton.innerHTML = getCostsIconHtml('proformaCurrencyAdd', '+', '#738196', 20);
    }
    if (productDepartmentAddButton) {
        productDepartmentAddButton.innerHTML = getCostsIconHtml('proformaCurrencyAdd', '+', '#738196', 20);
    }
}

let costosTurnos = [];

function turnoTimeToHtml(t) {
    if (!t) return "00:00";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
}

function calcTurnoDuracion(inicio, fin) {
    if (!inicio || !fin) return 0;
    const [ih, im] = inicio.split(":").map(Number);
    const [fh, fm] = fin.split(":").map(Number);
    const diff = (fh * 60 + fm) - (ih * 60 + im);
    return diff > 0 ? diff : diff + 1440;
}

async function loadTurnos() {
    try {
        const res = await fetch("/api/costos/turnos");
        const payload = await res.json();
        costosTurnos = (payload.ok && Array.isArray(payload.data)) ? payload.data : [];
    } catch {
        costosTurnos = [];
    }
    renderTurnosRows();
}

function renderTurnosRows() {
    if (!costosTurnosTableBody) return;
    const deleteIconHtml = getCostsIconHtml('quantity.delete', '\uD83D\uDDD1', '#b94848', 18);
    if (!costosTurnos.length) {
        costosTurnosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--app-text-muted,#6c7d8a);padding:16px;">No hay turnos configurados.</td></tr>';
        return;
    }
    costosTurnosTableBody.innerHTML = costosTurnos.map((turno, index) => `
        <tr data-turno-id="${turno.id}">
            <td><input type="text" class="costs-turno-name-input" data-turno-field="nombre" data-turno-id="${turno.id}" value="${escapeHtml(turno.nombre || "")}" placeholder="Nombre del turno"></td>
            <td><input type="time" class="costs-turno-time-input" data-turno-field="hora_inicio" data-turno-id="${turno.id}" value="${turnoTimeToHtml(turno.hora_inicio)}"></td>
            <td><input type="time" class="costs-turno-time-input" data-turno-field="hora_fin" data-turno-id="${turno.id}" value="${turnoTimeToHtml(turno.hora_fin)}"></td>
            <td><span class="costs-turno-duracion">${calcTurnoDuracion(turno.hora_inicio, turno.hora_fin)}<span class="costs-turno-duracion-unit">min</span></span></td>
            <td class="costs-process-default-cell-check"><label class="costs-process-default-check" aria-label="Activo"><input type="checkbox" data-turno-field="activo" data-turno-id="${turno.id}"${turno.activo !== false ? " checked" : ""}></label></td>
            <td class="costs-turno-acciones"><button type="button" class="costs-turno-delete-btn" data-turno-delete="${turno.id}" aria-label="Eliminar turno" title="Eliminar turno">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
}

costosAddTurnoButton?.addEventListener("click", async () => {
    const nombre = "Nuevo Turno";
    const hora_inicio = "08:00";
    const hora_fin = "16:00";
    try {
        const res = await fetch("/api/costos/turnos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, hora_inicio, hora_fin, activo: true })
        });
        const payload = await res.json();
        if (payload.ok && payload.data) {
            costosTurnos.push(payload.data);
            renderTurnosRows();
        }
    } catch {}
});

costosTurnosTableBody?.addEventListener("input", async (event) => {
    const target = event.target;
    const turnoId = target.dataset.turnoId;
    const field = target.dataset.turnoField;
    if (!turnoId || !field) return;
    const turno = costosTurnos.find(t => String(t.id) === String(turnoId));
    if (!turno) return;
    let value;
    if (field === "activo") {
        value = target.checked;
    } else if (field === "hora_inicio" || field === "hora_fin") {
        value = target.value || "00:00";
    } else {
        value = target.value;
    }
    turno[field] = value;
    if (field === "hora_inicio" || field === "hora_fin") {
        const duracionSpan = target.closest("tr")?.querySelector(".costs-turno-duracion");
        if (duracionSpan) {
            duracionSpan.innerHTML = calcTurnoDuracion(turno.hora_inicio, turno.hora_fin) + '<span class="costs-turno-duracion-unit">min</span>';
        }
    }
    try {
        await fetch(`/api/costos/turnos/${turnoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value })
        });
    } catch {}
});

costosTurnosTableBody?.addEventListener("change", async (event) => {
    const target = event.target;
    const turnoId = target.dataset.turnoId;
    const field = target.dataset.turnoField;
    if (!turnoId || !field) return;
    const turno = costosTurnos.find(t => String(t.id) === String(turnoId));
    if (!turno) return;
    const value = field === "activo" ? target.checked : target.value;
    turno[field] = value;
    try {
        await fetch(`/api/costos/turnos/${turnoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value })
        });
    } catch {}
});

costosTurnosTableBody?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-turno-delete]");
    if (!btn) return;
    const turnoId = btn.dataset.turnoDelete;
    try {
        const res = await fetch(`/api/costos/turnos/${turnoId}`, { method: "DELETE" });
        const payload = await res.json();
        if (payload.ok) {
            costosTurnos = costosTurnos.filter(t => String(t.id) !== String(turnoId));
            renderTurnosRows();
        }
    } catch {}
});

let productDepartments = [];

async function loadProductDepartmentsList() {
    try {
        const res = await fetch("/api/productos/departamentos");
        const data = await res.json();
        productDepartments = data.departamentos || [];
        renderProductDepartmentsTable();
    } catch (e) {
        console.error("Error cargando departamentos:", e);
    }
}

function renderProductDepartmentsTable() {
    if (!productDepartmentsTableBody) return;
    if (!productDepartments.length) {
        productDepartmentsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--app-text-muted,#6c7d8a);padding:16px;">No hay departamentos configurados.</td></tr>';
        return;
    }
    productDepartmentsTableBody.innerHTML = productDepartments.map((d, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><input type="text" value="${escapeHtml(d.code)}" class="department-code" data-department-id="${d.id}" maxlength="2" style="width:60px;text-align:center;font-family:monospace;"></td>
            <td><input type="text" value="${escapeHtml(d.name)}" class="department-name" data-department-id="${d.id}" maxlength="60"></td>
            <td class="costs-process-default-cell-check"><label class="costs-process-default-check" aria-label="Activo"><input type="checkbox" class="department-active" data-department-id="${d.id}" ${d.active ? "checked" : ""}></label></td>
        </tr>
    `).join("");
}

productDepartmentsTableBody?.addEventListener("change", async (event) => {
    const input = event.target.closest(".department-code, .department-name");
    const checkbox = event.target.closest(".department-active");
    if (input) {
        const id = input.dataset.departmentId;
        const field = input.classList.contains("department-code") ? "code" : "name";
        const val = input.value.trim();
        if (!val) return;
        try {
            await fetch(`/api/productos/departamentos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: val })
            });
        } catch (e) { console.error("Error actualizando departamento:", e); }
    } else if (checkbox) {
        const id = checkbox.dataset.departmentId;
        try {
            await fetch(`/api/productos/departamentos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: checkbox.checked })
            });
        } catch (e) { console.error("Error actualizando departamento:", e); }
    }
});

productDepartmentAddButton?.addEventListener("click", async () => {
    const code = prompt("Código de 2 dígitos para el nuevo departamento:");
    if (!code || !/^\d{2}$/.test(code)) return;
    const name = prompt("Nombre del departamento:");
    if (!name) return;
    try {
        await fetch("/api/productos/departamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code.trim(), name: name.trim() })
        });
        await loadProductDepartmentsList();
    } catch (e) { console.error("Error creando departamento:", e); }
});

let productTypes = [];
let productTypesFlexoDepartmentId = null;

async function loadProductTypesList() {
    try {
        const [deptsRes, tiposRes] = await Promise.all([
            fetch("/api/productos/departamentos"),
            fetch("/api/productos/tipos")
        ]);
        const deptsData = await deptsRes.json();
        const tiposData = await tiposRes.json();
        const flexoDept = (deptsData.departamentos || []).find(d => String(d.name || "").trim().toLowerCase() === "flexografía");
        productTypesFlexoDepartmentId = flexoDept ? flexoDept.id : null;
        productTypes = (tiposData.tipos || []).filter(t => String(t.department_name || "").trim().toLowerCase() === "flexografía");
        renderProductTypesTable();
    } catch (e) {
        console.error("Error cargando tipos de producto:", e);
    }
}

function renderProductTypesTable() {
    if (!productTypesTableBody) return;
    const deleteIconHtml = getCostsIconHtml('quantity.delete', '\uD83D\uDDD1', '#b94848', 18);
    if (!productTypes.length) {
        productTypesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--app-text-muted,#6c7d8a);padding:16px;">No hay tipos de producto configurados.</td></tr>';
        return;
    }
    productTypesTableBody.innerHTML = productTypes.map((t, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><input type="text" value="${escapeHtml(t.code)}" class="type-code" data-type-id="${t.id}" maxlength="2" style="width:60px;text-align:center;font-family:monospace;"></td>
            <td><input type="text" value="${escapeHtml(t.name)}" class="type-name" data-type-id="${t.id}" maxlength="60"></td>
            <td class="costs-process-default-cell-check"><label class="costs-process-default-check" aria-label="Activo"><input type="checkbox" class="type-active" data-type-id="${t.id}" ${t.active ? "checked" : ""}></label></td>
            <td><button type="button" class="costs-acabados-remove" data-delete-type="${t.id}" aria-label="Eliminar tipo" title="Eliminar tipo">${deleteIconHtml}</button></td>
        </tr>
    `).join("");
}

productTypesTableBody?.addEventListener("change", async (event) => {
    const input = event.target.closest(".type-code, .type-name");
    const checkbox = event.target.closest(".type-active");
    if (input) {
        const id = input.dataset.typeId;
        const field = input.classList.contains("type-code") ? "code" : "name";
        const val = input.value.trim().toUpperCase();
        if (!val) return;
        try {
            await fetch(`/api/productos/tipos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: val })
            });
        } catch (e) { console.error("Error actualizando tipo:", e); }
    } else if (checkbox) {
        const id = checkbox.dataset.typeId;
        try {
            await fetch(`/api/productos/tipos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: checkbox.checked })
            });
        } catch (e) { console.error("Error actualizando tipo:", e); }
    }
});

productTypesTableBody?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-delete-type]");
    if (!btn) return;
    if (!confirm("¿Eliminar este tipo de producto?")) return;
    try {
        await fetch(`/api/productos/tipos/${btn.dataset.deleteType}`, { method: "DELETE" });
        await loadProductTypesList();
    } catch (e) { console.error("Error eliminando tipo:", e); }
});

productTypeAddButton?.addEventListener("click", async () => {
    if (!productTypesFlexoDepartmentId) {
        alert("No se encontró el departamento de Flexografía.");
        return;
    }
    const code = prompt("Código de 2 dígitos para el nuevo tipo:");
    if (!code || !/^\d{2}$/.test(code)) return;
    const name = prompt("Nombre del tipo de producto:");
    if (!name) return;
    try {
        await fetch("/api/productos/tipos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code.toUpperCase(), name: name.toUpperCase(), departmentId: productTypesFlexoDepartmentId })
        });
        await loadProductTypesList();
    } catch (e) { console.error("Error creando tipo:", e); }
});

async function init() {
    try {
        await loadConfig();
        await loadCosts();
        await loadTurnos();
        await loadProductDepartmentsList();
        await loadProductTypesList();
        renderAcabadosAddButtonIcons();
        activateTab("general");
    } catch (error) {
        costsState = readLocalCostsConfig();
        renderCosts();
        await loadTurnos();
        renderAcabadosAddButtonIcons();
        activateTab("general");
        setSaveStatus(error.message || "No se pudo cargar el módulo.", true);
    }
}

/* ── Tipo de Cambio (movido desde configuracion-general.html) ──── */

const exchangeRateSubtabs = [...document.querySelectorAll(".exchange-rate-subtab")];
const exchangeRatePanels = [...document.querySelectorAll(".exchange-rate-panel")];
const exchangeRateRefreshButton = document.getElementById("exchangeRateRefreshButton");
const exchangeRateReloadButton = document.getElementById("exchangeRateReloadButton");
const exchangeRateStatusPill = document.getElementById("exchangeRateStatusPill");
const exchangeRateStatusMeta = document.getElementById("exchangeRateStatusMeta");
const exchangeRateSummaryGrid = document.getElementById("exchangeRateSummaryGrid");
const exchangeRateCards = document.getElementById("exchangeRateCards");
const exchangeRateCalcAmount = document.getElementById("exchangeRateCalcAmount");
const exchangeRateCalcFrom = document.getElementById("exchangeRateCalcFrom");
const exchangeRateCalcTo = document.getElementById("exchangeRateCalcTo");
const exchangeRateCalcResult = document.getElementById("exchangeRateCalcResult");
const exchangeRateHistorySummary = document.getElementById("exchangeRateHistorySummary");
const exchangeRateHistoryBody = document.getElementById("exchangeRateHistoryBody");
const exchangeRateBaseCurrency = document.getElementById("exchangeRateBaseCurrency");
const exchangeRateDefaultCurrency = document.getElementById("exchangeRateDefaultCurrency");
const exchangeRateAutoUpdate = document.getElementById("exchangeRateAutoUpdate");
const exchangeRateUpdateTime = document.getElementById("exchangeRateUpdateTime");
const exchangeRateDays = document.getElementById("exchangeRateDays");
const exchangeRateCurrencies = document.getElementById("exchangeRateCurrencies");
const exchangeRateSaveConfigButton = document.getElementById("exchangeRateSaveConfigButton");
const exchangeRateConfigStatus = document.getElementById("exchangeRateConfigStatus");
const exchangeRateLogSummary = document.getElementById("exchangeRateLogSummary");
const exchangeRateLogBody = document.getElementById("exchangeRateLogBody");
let exchangeRateLoadedOnce = false;
let exchangeRateState = null;

function setExchangeRateConfigStatus(message, tone = "") {
    if (!exchangeRateConfigStatus) return;
    exchangeRateConfigStatus.textContent = message || "Listo para editar.";
    exchangeRateConfigStatus.classList.remove("is-error", "is-success");
    if (tone === "error") exchangeRateConfigStatus.classList.add("is-error");
    if (tone === "success") exchangeRateConfigStatus.classList.add("is-success");
}

function getExchangeRateStatusTone(status) {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "success") return "is-success";
    if (normalized === "error") return "is-error";
    if (normalized === "running") return "is-running";
    return "";
}

function formatExchangeRateNumber(value) {
    const numeric = Number(value || 0) || 0;
    if (numeric >= 1000) return formatoNumeroApp(numeric, 2, { minimoDecimales: 0 });
    if (numeric >= 1) return formatoNumeroApp(numeric, 4, { minimoDecimales: 2 });
    return formatoNumeroApp(numeric, 6, { minimoDecimales: 0 });
}

function formatExchangeRateDateTime(value) {
    if (!value) return "Sin registro";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin registro";
    return date.toLocaleString("es-CR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function activateExchangeRateTab(tabKey = "tasas") {
    exchangeRateSubtabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.exchangeRateTab === tabKey);
    });
    exchangeRatePanels.forEach((panel) => {
        panel.hidden = panel.id !== `exchange-rate-panel-${tabKey}`;
    });
}

function renderExchangeRateSelectOptions(select, rows = [], selectedValue = "") {
    if (!select) return;
    select.innerHTML = rows.map((row) => `<option value="${escapeHtml(row.code)}">${escapeHtml(`${row.code} · ${row.name || row.label || row.code}`)}</option>`).join("");
    if ([...select.options].some((option) => option.value === selectedValue)) {
        select.value = selectedValue;
    }
}

function renderExchangeRateChipGroup(host, items = [], selectedValues = [], fieldName) {
    if (!host) return;
    const selected = new Set((selectedValues || []).map((item) => {
        const raw = String(item || "").trim();
        return fieldName === "day" ? raw.toLowerCase() : raw.toUpperCase();
    }));
    host.innerHTML = items.map((item) => {
        const value = fieldName === "day" ? String(item.value || "").trim().toLowerCase() : String(item.code || "").trim().toUpperCase();
        const selectedClass = selected.has(value);
        return `
            <label class="exchange-rate-chip${selectedClass ? " is-selected" : ""}" data-exchange-chip="${escapeHtml(value)}" data-exchange-chip-group="${escapeHtml(fieldName)}">
                <input type="checkbox" value="${escapeHtml(value)}" ${selectedClass ? "checked" : ""}>
                <span>${escapeHtml(item.label || `${item.code} · ${item.name || item.code}`)}</span>
            </label>
        `;
    }).join("");
}

function syncExchangeRateChipSelection(host) {
    host?.querySelectorAll(".exchange-rate-chip").forEach((chip) => {
        const input = chip.querySelector("input");
        chip.classList.toggle("is-selected", Boolean(input?.checked));
    });
}

function getSelectedExchangeRateChipValues(host, transform = (value) => value) {
    return [...(host?.querySelectorAll("input:checked") || [])].map((input) => transform(input.value));
}

function renderExchangeRateState() {
    const state = exchangeRateState;
    if (!state) return;
    const config = state.config || {};
    const today = state.today || {};
    const items = Array.isArray(today.items) ? today.items : [];
    const history = Array.isArray(state.history) ? state.history : [];
    const logs = Array.isArray(state.logs) ? state.logs : [];
    const catalog = Array.isArray(state.catalog) ? state.catalog : [];

    if (exchangeRateStatusPill) {
        exchangeRateStatusPill.className = `exchange-rate-status-pill ${getExchangeRateStatusTone(config.lastSyncStatus)}`.trim();
        exchangeRateStatusPill.textContent = config.lastSyncStatus === "success"
            ? "Actualizado correctamente"
            : config.lastSyncStatus === "error"
                ? "Error de actualización"
                : config.lastSyncStatus === "running"
                    ? "Actualizando..."
                    : "Sincronización pendiente";
    }
    if (exchangeRateStatusMeta) {
        const baseText = today.baseCurrency || config.baseCurrency || "USD";
        const dateText = today.rateDate || "sin fecha";
        exchangeRateStatusMeta.textContent = `${baseText} · ${dateText} · Último intento: ${formatExchangeRateDateTime(config.lastSyncFinishedAt || config.lastSyncStartedAt)}`;
    }
    if (exchangeRateSummaryGrid) {
        exchangeRateSummaryGrid.innerHTML = `
            <div class="exchange-rate-summary-card">
                <span>Moneda base</span>
                <strong>${escapeHtml(today.baseCurrency || config.baseCurrency || "USD")}</strong>
            </div>
            <div class="exchange-rate-summary-card">
                <span>Fecha de tasa</span>
                <strong>${escapeHtml(today.rateDate || "Sin datos")}</strong>
            </div>
        `;
    }
    if (exchangeRateCards) {
        exchangeRateCards.innerHTML = items.length
            ? items.map((item) => `
                <div class="exchange-rate-card">
                    <span>${escapeHtml(item.code)} · ${escapeHtml(item.name || item.code)}</span>
                    <strong>${item.isBase ? "Moneda base" : "1 " + escapeHtml(today.baseCurrency || config.baseCurrency || "USD")}</strong>
                    <div class="exchange-rate-card-value">${item.isBase ? "1.0000" : escapeHtml(formatExchangeRateNumber(item.rate))}</div>
                </div>
            `).join("")
            : '<div class="exchange-rate-empty">Todavía no hay tasas guardadas. Usa "Actualizar ahora" para traerlas.</div>';
    }

    renderExchangeRateSelectOptions(exchangeRateCalcFrom, items.length ? items : catalog, today.baseCurrency || config.baseCurrency || "USD");
    renderExchangeRateSelectOptions(exchangeRateCalcTo, items.length ? items : catalog, today.defaultCurrency || config.defaultCurrency || "CRC");
    renderExchangeRateSelectOptions(exchangeRateBaseCurrency, catalog, config.baseCurrency || "USD");
    renderExchangeRateSelectOptions(exchangeRateDefaultCurrency, catalog.filter((item) => (config.enabledCurrencies || []).includes(item.code) || item.code === config.baseCurrency), config.defaultCurrency || "CRC");
    if (exchangeRateAutoUpdate) exchangeRateAutoUpdate.value = String(config.autoUpdateEnabled) === "false" ? "false" : "true";
    if (exchangeRateUpdateTime) exchangeRateUpdateTime.value = config.updateTime || "00:00";

    renderExchangeRateChipGroup(exchangeRateDays, [
        { value: "sun", label: "Domingo" },
        { value: "mon", label: "Lunes" },
        { value: "tue", label: "Martes" },
        { value: "wed", label: "Miércoles" },
        { value: "thu", label: "Jueves" },
        { value: "fri", label: "Viernes" },
        { value: "sat", label: "Sábado" }
    ], config.updateDays || [], "day");
    renderExchangeRateChipGroup(exchangeRateCurrencies, catalog.map((item) => ({
        code: item.code,
        label: `${item.code} · ${item.name}`
    })), config.enabledCurrencies || [], "currency");

    if (exchangeRateHistorySummary) {
        exchangeRateHistorySummary.textContent = history.length
            ? `${history.length} actualizaciones históricas cargadas.`
            : "Todavía no hay historial de tasas guardado.";
    }
    if (exchangeRateHistoryBody) {
        exchangeRateHistoryBody.innerHTML = history.length
            ? history.map((row) => {
                const preview = Object.entries(row.rates || {}).slice(0, 6)
                    .map(([code, rate]) => `${code}: ${formatExchangeRateNumber(rate)}`)
                    .join(" · ");
                return `
                    <tr>
                        <td>${escapeHtml(row.rateDate || "")}</td>
                        <td>${escapeHtml(row.baseCurrency || "")}</td>
                        <td>${escapeHtml(formatExchangeRateDateTime(row.fetchedAt))}</td>
                        <td class="exchange-rate-log-message">${escapeHtml(preview || "Sin detalle")}</td>
                    </tr>
                `;
            }).join("")
            : '<tr><td colspan="4">Todavía no hay historial disponible.</td></tr>';
    }

    if (exchangeRateLogSummary) {
        exchangeRateLogSummary.textContent = logs.length
            ? `${logs.length} ejecuciones registradas.`
            : "Todavía no hay bitácora de actualización.";
    }
    if (exchangeRateLogBody) {
        exchangeRateLogBody.innerHTML = logs.length
            ? logs.map((row) => `
                <tr>
                    <td>${escapeHtml(formatExchangeRateDateTime(row.started_at))}</td>
                    <td>${escapeHtml(String(row.trigger_type || "").trim() || "manual")}</td>
                    <td>${escapeHtml(String(row.status || "").trim() || "")}</td>
                    <td>${escapeHtml(String(row.currencies_count || 0))}</td>
                    <td class="exchange-rate-log-message">${escapeHtml(row.error_message || row.response_summary?.providerUrl || row.response_summary?.providerName || "Sin observaciones")}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="5">Todavía no hay bitácora disponible.</td></tr>';
    }

    renderExchangeRateCalculation();
}

function renderExchangeRateCalculation() {
    if (!exchangeRateCalcResult || !exchangeRateState) return;
    const items = Array.isArray(exchangeRateState?.today?.items) ? exchangeRateState.today.items : [];
    const rateMap = new Map(items.map((item) => [item.code, Number(item.rate || 0) || 0]));
    const baseCurrency = exchangeRateState?.config?.baseCurrency || "USD";
    const from = exchangeRateCalcFrom?.value || baseCurrency;
    const to = exchangeRateCalcTo?.value || exchangeRateState?.config?.defaultCurrency || baseCurrency;
    const amount = Number(exchangeRateCalcAmount?.value || 0) || 0;
    const fromRate = from === baseCurrency ? 1 : Number(rateMap.get(from) || 0) || 0;
    const toRate = to === baseCurrency ? 1 : Number(rateMap.get(to) || 0) || 0;
    if ((from !== baseCurrency && fromRate <= 0) || (to !== baseCurrency && toRate <= 0)) {
        exchangeRateCalcResult.textContent = "No hay tasas suficientes para convertir estas monedas.";
        return;
    }
    const amountInBase = from === baseCurrency ? amount : (amount / fromRate);
    const result = to === baseCurrency ? amountInBase : (amountInBase * toRate);
    exchangeRateCalcResult.innerHTML = `
        <span class="exchange-rate-calc-result-main">${escapeHtml(formatoNumeroApp(amount, 4, { minimoDecimales: 0 }))} ${escapeHtml(from)} = ${escapeHtml(formatoNumeroApp(result, 4, { minimoDecimales: 0 }))} ${escapeHtml(to)}</span>
        <span class="exchange-rate-calc-result-meta">Base usada: ${escapeHtml(baseCurrency)} · Fecha: ${escapeHtml(exchangeRateState?.today?.rateDate || "Sin datos")}</span>
    `;
}

async function loadExchangeRateModule(force = false) {
    if (exchangeRateLoadedOnce && !force) {
        renderExchangeRateState();
        return;
    }
    const response = await fetch("/api/exchange-rates/state");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No fue posible cargar el tipo de cambio.");
    exchangeRateState = payload;
    exchangeRateLoadedOnce = true;
    renderExchangeRateState();
}

async function saveExchangeRateModuleConfig() {
    const enabledCurrencies = getSelectedExchangeRateChipValues(exchangeRateCurrencies, (value) => String(value || "").trim().toUpperCase());
    const updateDays = getSelectedExchangeRateChipValues(exchangeRateDays, (value) => String(value || "").trim().toLowerCase());
    const response = await fetch("/api/exchange-rates/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            baseCurrency: exchangeRateBaseCurrency?.value || "USD",
            defaultCurrency: exchangeRateDefaultCurrency?.value || "CRC",
            autoUpdateEnabled: exchangeRateAutoUpdate?.value !== "false",
            updateTime: exchangeRateUpdateTime?.value || "00:00",
            updateDays,
            enabledCurrencies
        })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No fue posible guardar la configuración del tipo de cambio.");
    setExchangeRateConfigStatus("Configuración guardada.", "success");
    await loadExchangeRateModule(true);
}

async function refreshExchangeRateModule() {
    setExchangeRateConfigStatus("Actualizando tasas...", "");
    const response = await fetch("/api/exchange-rates/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerType: "manual" })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No fue posible actualizar las tasas.");
    exchangeRateState = payload.state || exchangeRateState;
    exchangeRateLoadedOnce = true;
    renderExchangeRateState();
    setExchangeRateConfigStatus("Tasas actualizadas correctamente.", "success");
}

exchangeRateSubtabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        activateExchangeRateTab(tab.dataset.exchangeRateTab || "tasas");
    });
});

exchangeRateDays?.addEventListener("change", () => {
    syncExchangeRateChipSelection(exchangeRateDays);
});

exchangeRateCurrencies?.addEventListener("change", () => {
    syncExchangeRateChipSelection(exchangeRateCurrencies);
    const selectedCurrencies = getSelectedExchangeRateChipValues(exchangeRateCurrencies, (value) => String(value || "").trim().toUpperCase());
    const options = (exchangeRateState?.catalog || []).filter((item) => selectedCurrencies.includes(item.code) || item.code === (exchangeRateBaseCurrency?.value || "USD"));
    renderExchangeRateSelectOptions(exchangeRateDefaultCurrency, options, exchangeRateDefaultCurrency?.value || exchangeRateState?.config?.defaultCurrency || "CRC");
});

exchangeRateBaseCurrency?.addEventListener("change", () => {
    const baseCurrency = exchangeRateBaseCurrency.value || "USD";
    const selectedCurrencies = getSelectedExchangeRateChipValues(exchangeRateCurrencies, (value) => String(value || "").trim().toUpperCase());
    if (!selectedCurrencies.includes(baseCurrency)) {
        const baseInput = exchangeRateCurrencies?.querySelector(`input[value="${baseCurrency}"]`);
        if (baseInput) {
            baseInput.checked = true;
            syncExchangeRateChipSelection(exchangeRateCurrencies);
        }
    }
    const options = (exchangeRateState?.catalog || []).filter((item) => {
        const enabled = getSelectedExchangeRateChipValues(exchangeRateCurrencies, (value) => String(value || "").trim().toUpperCase());
        return enabled.includes(item.code) || item.code === baseCurrency;
    });
    renderExchangeRateSelectOptions(exchangeRateDefaultCurrency, options, exchangeRateDefaultCurrency?.value || exchangeRateState?.config?.defaultCurrency || "CRC");
});

exchangeRateCalcAmount?.addEventListener("input", renderExchangeRateCalculation);
exchangeRateCalcFrom?.addEventListener("change", renderExchangeRateCalculation);
exchangeRateCalcTo?.addEventListener("change", renderExchangeRateCalculation);
exchangeRateReloadButton?.addEventListener("click", () => {
    loadExchangeRateModule(true).catch((error) => {
        setExchangeRateConfigStatus(error.message || "No fue posible recargar el tipo de cambio.", "error");
    });
});
exchangeRateRefreshButton?.addEventListener("click", () => {
    refreshExchangeRateModule().catch((error) => {
        setExchangeRateConfigStatus(error.message || "No fue posible actualizar las tasas.", "error");
    });
});
exchangeRateSaveConfigButton?.addEventListener("click", () => {
    saveExchangeRateModuleConfig().catch((error) => {
        setExchangeRateConfigStatus(error.message || "No fue posible guardar la configuración del tipo de cambio.", "error");
    });
});
/* ── Inventarios SAP (Costos → Inventarios SAP) ────────────────── */

const inventariosSapPanel = document.querySelector('.costs-panel[data-panel="inventarios-sap"]');
const inventariosSapAviso = document.getElementById("inventariosSapAviso");
const inventariosSapSearch = document.getElementById("inventariosSapSearch");
const inventariosSapEstado = document.getElementById("inventariosSapEstado");
const inventariosSapContenido = document.getElementById("inventariosSapContenido");
const inventariosSapSoloStock = document.getElementById("inventariosSapSoloStock");
const inventariosSapReloadButton = document.getElementById("inventariosSapReloadButton");
const inventariosSapTabsBox = document.getElementById("inventariosSapTabs");
const inventariosSapConsultaPopover = document.getElementById("inventariosSapConsultaPopover");
const inventariosSapConsultaTitulo = document.getElementById("inventariosSapConsultaTitulo");
const inventariosSapConsultaSql = document.getElementById("inventariosSapConsultaSql");
const inventariosSapConsultaClose = document.getElementById("inventariosSapConsultaClose");
let inventariosSapLoadedOnce = false;
let inventariosSapCargando = false;
let inventariosSapSearchTimer = null;
let inventariosSapTabActiva = "";
let inventariosSapState = { categorias: [] };

function inventariosSapFormatoCantidad(valor) {
    const numero = numberValue(valor, 0);
    return formatoNumeroApp(numero, 2, { minimoDecimales: 0 });
}

function inventariosSapFormatoFecha(valor) {
    if (!valor) return "Sin registro";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "Sin registro";
    return fecha.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function inventariosSapEtiquetaFuente(fila) {
    if (fila.via === "clasificacion") return '<span class="inventarios-sap-chip inventarios-sap-chip-clasif">Clasificaci\u00f3n</span>';
    if (fila.via === "texto") return '<span class="inventarios-sap-chip inventarios-sap-chip-texto">Por nombre</span>';
    return "";
}

function inventariosSapTablaCategoria(categoria) {
    const filasStock = categoria.filas.filter((fila) => numberValue(fila.on_hand, 0) > 0);
    const visibles = inventariosSapSoloStock?.checked ? filasStock : categoria.filas;
    return `
        <div class="inventarios-sap-bloque">
            <div class="inventarios-sap-bloque-head">
                <div class="inventarios-sap-bloque-datos">
                    <span class="inventarios-sap-metrica"><strong>${inventariosSapFormatoCantidad(categoria.total)}</strong> art\u00edculos</span>
                    <span class="inventarios-sap-metrica"><strong>${inventariosSapFormatoCantidad(filasStock.length)}</strong> con existencia</span>
                    <span class="inventarios-sap-metrica"><strong>${inventariosSapFormatoCantidad(categoria.conPrecio)}</strong> con precio</span>
                    <span class="inventarios-sap-metrica inventarios-sap-metrica-sync">Actualizado: ${inventariosSapFormatoFecha(categoria.ultimaSync)}</span>
                </div>
            </div>
            <div class="inventarios-sap-table-wrap">
                <table class="inventarios-sap-table">
                    <thead>
                        <tr>
                            <th>C\u00f3digo</th>
                            <th>Descripci\u00f3n</th>
                            <th>Grupo</th>
                            <th class="num">Existencia</th>
                            <th>Unidad</th>
                            <th>Precio</th>
                            <th>Moneda</th>
                            <th>Origen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibles.length ? visibles.map((fila) => `
                            <tr>
                                <td class="inventarios-sap-codigo">${escapeHtml(fila.item_code)}</td>
                                <td>${escapeHtml(fila.item_name)}</td>
                                <td>${escapeHtml(fila.item_group_code || "")}</td>
                                <td class="num"><strong>${inventariosSapFormatoCantidad(fila.on_hand)}</strong></td>
                                <td>${escapeHtml(fila.uom || "")}</td>
                                <td class="num">${numberValue(fila.price, 0) > 0 ? inventariosSapFormatoCantidad(fila.price) : ""}</td>
                                <td>${escapeHtml(fila.currency || "")}</td>
                                <td>${inventariosSapEtiquetaFuente(fila)}</td>
                            </tr>
                        `).join("") : `<tr><td colspan="8" class="inventarios-sap-vacio">${categoria.filas.length ? "Sin existencias en este momento. Desmarca \u201cSolo con existencia\u201d para ver el resto." : "SAP no reporta art\u00edculos para esta categor\u00eda."}</td></tr>`}</tbody>
                </table>
            </div>
            ${categoria.limiteAlcanzado ? `<p class="inventarios-sap-limite">La lista est\u00e1 recortada en 2,000 art\u00edculos. Use el buscador para encontrar uno espec\u00edfico.</p>` : ""}
            <div class="inventarios-sap-bloque-foot">
                <button type="button" class="inventarios-sap-consulta-btn" data-consulta-inv="${escapeHtml(categoria.clave)}">Consulta Oficial</button>
            </div>
        </div>
    `;
}

function inventariosSapRenderAviso() {
    if (!inventariosSapAviso) return;
    const categorias = inventariosSapState.categorias || [];
    const faltantes = [];
    if (categorias.length && categorias.every((categoria) => !categoria.total)) {
        faltantes.push("SAP no reporta art\u00edculos para ninguna categor\u00eda del c\u00e1lculo.");
    }
    const sinClasificar = categorias.some((categoria) => categoria.conTexto > 0 && categoria.conClasificacion === 0);
    const sinPrecio = categorias.some((categoria) => categoria.total > 0 && categoria.conPrecio === 0);
    if (sinClasificar) {
        faltantes.push("Los art\u00edculos no traen el campo Clasificaci\u00f3n desde SAP: se est\u00e1n agrupando por palabras del nombre, lo que puede fallar. Se solicit\u00f3 al cliente completar ese campo en SAP.");
    }
    if (sinPrecio) {
        faltantes.push("Ning\u00fan art\u00edculo trae precio desde SAP.");
    }
    if (!faltantes.length) {
        inventariosSapAviso.hidden = true;
        inventariosSapAviso.replaceChildren();
        return;
    }
    inventariosSapAviso.hidden = false;
    inventariosSapAviso.innerHTML = `
        <strong>Atenci\u00f3n \u00b7 datos faltantes</strong>
        <ul>${faltantes.map((mensaje) => `<li>${escapeHtml(mensaje)}</li>`).join("")}</ul>
    `;
}

function inventariosSapRenderTabs() {
    if (!inventariosSapTabsBox) return;
    const categorias = inventariosSapState.categorias || [];
    if (!inventariosSapTabActiva || !categorias.some((categoria) => categoria.clave === inventariosSapTabActiva)) {
        inventariosSapTabActiva = categorias.length ? categorias[0].clave : "";
    }
    inventariosSapTabsBox.innerHTML = categorias.map((categoria) => {
        const conStock = categoria.filas.filter((fila) => numberValue(fila.on_hand, 0) > 0).length;
        const activa = categoria.clave === inventariosSapTabActiva;
        return `<button type="button" class="inventarios-sap-tab${activa ? " is-active" : ""}" data-tab-inv="${escapeHtml(categoria.clave)}" aria-selected="${activa}">
            <span>${escapeHtml(categoria.etiqueta)}</span>
            <span class="inventarios-sap-tab-count">${inventariosSapFormatoCantidad(conStock)}</span>
        </button>`;
    }).join("");
}

function inventariosSapRender() {
    if (!inventariosSapContenido) return;
    const categorias = inventariosSapState.categorias || [];
    if (!categorias.length) {
        inventariosSapTabsBox.innerHTML = "";
        inventariosSapContenido.innerHTML = '<div class="inventarios-sap-empty">SAP no reporta art\u00edculos para ninguna categor\u00eda del c\u00e1lculo.</div>';
        inventariosSapRenderAviso();
        return;
    }
    inventariosSapRenderTabs();
    const categoriaActiva = categorias.find((categoria) => categoria.clave === inventariosSapTabActiva);
    inventariosSapContenido.innerHTML = categoriaActiva ? inventariosSapTablaCategoria(categoriaActiva) : '';
    inventariosSapRenderAviso();
}

function inventariosSapAbrirConsulta(clave) {
    const categorias = inventariosSapState.categorias || [];
    const categoria = categorias.find((item) => item.clave === clave) || null;
    if (!categoria || !inventariosSapConsultaPopover) return;
    inventariosSapConsultaTitulo.textContent = `Consulta Oficial \u00b7 ${categoria.etiqueta}`;
    inventariosSapConsultaSql.textContent = categoria.consultaOficial || "Esta categor\u00eda todav\u00eda no tiene una consulta oficial guardada.";
    inventariosSapConsultaPopover.hidden = false;
}

inventariosSapTabsBox?.addEventListener("click", (event) => {
    const boton = event.target.closest("[data-tab-inv]");
    if (!boton) return;
    inventariosSapTabActiva = boton.dataset.tabInv;
    inventariosSapRender();
});

inventariosSapContenido?.addEventListener("click", (event) => {
    const boton = event.target.closest("[data-consulta-inv]");
    if (!boton) return;
    inventariosSapAbrirConsulta(boton.dataset.consultaInv);
});

inventariosSapConsultaClose?.addEventListener("click", () => {
    if (inventariosSapConsultaPopover) inventariosSapConsultaPopover.hidden = true;
});

inventariosSapConsultaPopover?.addEventListener("click", (event) => {
    if (event.target === inventariosSapConsultaPopover) inventariosSapConsultaPopover.hidden = true;
});

function inventariosSapSetEstado(mensaje) {
    if (inventariosSapEstado) inventariosSapEstado.textContent = mensaje || "";
}

async function loadInventariosSap(force = false) {
    if (!inventariosSapContenido) return;
    if (inventariosSapCargando) return;
    if (inventariosSapLoadedOnce && !force) {
        inventariosSapRender();
        return;
    }
    inventariosSapCargando = true;
    inventariosSapSetEstado("Cargando...");
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 30000);
    try {
        const params = new URLSearchParams();
        if (inventariosSapSearch?.value.trim()) params.set("search", inventariosSapSearch.value.trim());
        const [response, respuestaConsultas] = await Promise.all([
            fetch(`/api/costos/inventarios-sap${params.toString() ? `?${params}` : ""}`, { signal: controlador.signal }),
            fetch("/api/costos/consultas-oficiales", { signal: controlador.signal }).catch(() => null)
        ]);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("El servidor no reconoce esta consulta porque quedó abierta antes de la actualización. Cierra y vuelve a abrir el servidor (o pide un reinicio) y los inventarios cargarán.");
            }
            if (response.status === 502 || response.status === 503 || response.status === 504) {
                throw new Error("La conexión con la base de datos está saturada o caída. Espera un momento y presiona Recargar.");
            }
            throw new Error(payload.error || `El servidor respondió con un error inesperado (código ${response.status}).`);
        }
        if (respuestaConsultas?.ok) {
            const datosConsultas = await respuestaConsultas.json().catch(() => ({}));
            const consultaPorClave = new Map((datosConsultas.consultas || []).map((consulta) => [consulta.clave, consulta.sql]));
            (payload.categorias || []).forEach((categoria) => {
                categoria.consultaOficial = consultaPorClave.get(categoria.consulta || categoria.clave) || "";
            });
        }
        inventariosSapState = payload;
        inventariosSapLoadedOnce = true;
        inventariosSapRender();
        inventariosSapSetEstado("");
    } catch (error) {
        let mensaje = error?.message || "No fue posible cargar los inventarios SAP.";
        if (error?.name === "AbortError") {
            mensaje = "El servidor tardó demasiado en responder; la conexión con la base de datos puede estar saturada. Intenta de nuevo con el buscador o presiona Recargar.";
        } else if (error instanceof TypeError) {
            mensaje = "No hay comunicación con el servidor. Verifica que el servidor esté encendido y presiona Recargar.";
        }
        inventariosSapContenido.innerHTML = `<div class="inventarios-sap-empty is-error">${escapeHtml(mensaje)}</div>`;
        inventariosSapSetEstado("");
    } finally {
        clearTimeout(temporizador);
        inventariosSapCargando = false;
    }
}

inventariosSapSearch?.addEventListener("input", () => {
    clearTimeout(inventariosSapSearchTimer);
    inventariosSapSearchTimer = setTimeout(() => {
        loadInventariosSap(true).catch(() => {});
    }, 400);
});

inventariosSapSoloStock?.addEventListener("change", () => {
    inventariosSapRender();
});

inventariosSapReloadButton?.addEventListener("click", () => {
    loadInventariosSap(true).catch(() => {});
});

window.openEditarProcesoModal = function(index) {
    const row = costsState?.general?.processDefaults?.[index];
    if (!row) return;

    let modalEl = document.getElementById("costs-edit-process-modal");
    if (!modalEl) {
        modalEl = document.createElement("div");
        modalEl.id = "costs-edit-process-modal";
        modalEl.className = "costs-modal-overlay";
        document.body.appendChild(modalEl);
    }
    modalEl.removeAttribute("hidden");

    const asignadas = costsProcesosMaquinasMap[row.key] || [];
    const idsAsignadas = new Set(asignadas.map(a => String(a.maquina_id)));
    const disponibles = (costsMaquinasInventario || []).filter(m => !idsAsignadas.has(String(m.id)));

    modalEl.innerHTML = `
        <div class="costs-modal" style="width:580px;max-width:92vw;">
            <div class="costs-modal-head">
                <h3 class="costs-modal-title">⚙️ Editar Proceso: ${escapeHtml(row.label)}</h3>
                <button type="button" class="costs-modal-close" onclick="closeEditarProcesoModal()">✕</button>
            </div>
            <div class="costs-modal-body">
                <div class="costs-modal-field">
                    <label style="font-size:12px;font-weight:600;color:var(--app-text-muted,#60707f);display:block;margin-bottom:4px;">Nombre del Proceso</label>
                    <input type="text" id="modal-proc-label" value="${escapeHtml(row.label)}" style="width:100%;height:40px;border-radius:12px;padding:0 12px;border:1px solid #cfd8df;background:var(--app-surface,#ffffff);color:var(--app-text,#0f172a);font-size:13px;">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="costs-modal-field">
                        <label style="font-size:12px;font-weight:600;color:var(--app-text-muted,#60707f);display:block;margin-bottom:4px;">Orden en Secuencia (Gantt)</label>
                        <input type="number" id="modal-proc-order" value="${escapeHtml(row.order || (index + 1))}" min="1" max="999" step="10" style="width:100%;height:40px;border-radius:12px;padding:0 12px;border:1px solid #cfd8df;background:var(--app-surface,#ffffff);color:var(--app-text,#0f172a);font-size:13px;">
                    </div>
                    <div class="costs-modal-field">
                        <label style="font-size:12px;font-weight:600;color:var(--app-text-muted,#60707f);display:block;margin-bottom:4px;">Color en el Gantt</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="color" id="modal-proc-color" value="${escapeHtml(row.colorGantt || '#378ADD')}" style="width:48px;height:40px;border-radius:10px;border:1px solid #cfd8df;cursor:pointer;padding:2px;background:none;" onchange="document.getElementById('modal-proc-color-hex').innerText = this.value">
                            <span id="modal-proc-color-hex" style="font-size:13px;font-weight:600;color:var(--app-text,#0f172a);">${escapeHtml(row.colorGantt || '#378ADD')}</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--app-border,#e2e8f0);border-radius:12px;background:var(--app-surface-soft,#f8fafc);">
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;cursor:pointer;color:var(--app-text,#0f172a);">
                        <input type="checkbox" id="modal-proc-paralelo"${row.procesoParalelo ? " checked" : ""}>
                        <span>Proceso paralelo (puede ejecutarse al mismo tiempo que el anterior)</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;cursor:pointer;color:var(--app-text,#0f172a);" title="Al programar, el trabajo debe caber entero en un turno (con la holgura de Costos). Si no cabe, no se inicia y se pasa al siguiente turno; ese rato lo puede usar otra orden que sí quepa.">
                        <input type="checkbox" id="modal-proc-turno"${row.terminarEnTurno ? " checked" : ""}>
                        <span>Terminar dentro del turno (no se parte entre turnos)</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;cursor:pointer;color:var(--app-text,#0f172a);">
                        <input type="checkbox" id="modal-proc-gantt"${row.ganttEnabled ? " checked" : ""}>
                        <span>Activo en Gantt (visible en la línea de tiempo)</span>
                    </label>
                </div>

                <div class="costs-modal-field">
                    <label style="font-size:12px;font-weight:600;color:var(--app-text-muted,#60707f);display:block;margin-bottom:4px;">Horario por Defecto del Proceso</label>
                    <select id="modal-proc-calendario" style="width:100%;height:40px;border-radius:12px;padding:0 12px;border:1px solid #cfd8df;background:var(--app-surface,#ffffff);color:var(--app-text,#0f172a);font-size:13px;">
                        <option value="">(Sin horario — el proceso no se programa)</option>
                        ${(costsCalendariosList || []).map(c => `<option value="${escapeHtml(c.id)}"${row.calendarioId === c.id ? " selected" : ""}>${escapeHtml(c.calendar_name || c.nombre)}</option>`).join("")}
                    </select>
                </div>

                <div class="costs-modal-field" style="border-top:1px solid var(--app-border,#e2e8f0);padding-top:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--app-text-muted,#60707f);display:block;margin-bottom:8px;">Máquinas Asignadas al Proceso</label>
                    ${!asignadas.length ? '<div style="font-size:12px;color:var(--app-text-muted,#64748b);padding:10px;background:var(--app-surface-soft,#f8fafc);border-radius:10px;border:1px dashed var(--app-border,#cbd5e1);">Sin máquinas asignadas actualmente.</div>' : `
                        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                            ${asignadas.map(a => `
                                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--app-surface-soft,#f8fafc);border:1px solid var(--app-border,#e2e8f0);border-radius:10px;font-size:13px;">
                                    <div>
                                        <strong style="color:var(--app-text,#0f172a);">${escapeHtml(a.maquina_nombre)}</strong>
                                        ${a.calendario_nombre ? `<span style="font-size:11px;color:var(--app-text-muted,#64748b);margin-left:6px;">(${escapeHtml(a.calendario_nombre)})</span>` : ''}
                                    </div>
                                    <button type="button" style="border:0;background:transparent;color:#ef4444;cursor:pointer;font-size:14px;" title="Quitar máquina" onclick="quitarMaquinaModalProceso('${escapeHtml(row.key)}', '${escapeHtml(a.id)}', ${index})">🗑️</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                    ${!disponibles.length ? '' : `
                        <div style="display:flex;gap:8px;margin-top:10px;">
                            <select id="modal-nueva-maquina-select" style="flex:1;height:38px;border-radius:10px;padding:0 8px;border:1px solid #cfd8df;background:var(--app-surface,#ffffff);color:var(--app-text,#0f172a);font-size:12px;">
                                <option value="">Seleccionar máquina...</option>
                                ${disponibles.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)}</option>`).join("")}
                            </select>
                            <select id="modal-nueva-maquina-calendario" style="flex:1;height:38px;border-radius:10px;padding:0 8px;border:1px solid #cfd8df;background:var(--app-surface,#ffffff);color:var(--app-text,#0f172a);font-size:12px;">
                                <option value="">(Sin horario individual)</option>
                                ${(costsCalendariosList || []).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.calendar_name || c.nombre)}</option>`).join('')}
                            </select>
                            <button type="button" class="costs-btn-primary" style="height:38px;padding:0 14px;font-size:12px;border-radius:10px;" onclick="agregarMaquinaModalProceso('${escapeHtml(row.key)}', ${index})">+ Asignar</button>
                        </div>
                    `}
                </div>
            </div>
            <div class="costs-modal-foot">
                <button type="button" class="costs-btn-secondary" onclick="closeEditarProcesoModal()">Cancelar</button>
                <button type="button" class="costs-btn-primary" onclick="guardarEditarProcesoModal(${index})">Guardar Cambios</button>
            </div>
        </div>
    `;
};

window.closeEditarProcesoModal = function() {
    const modalEl = document.getElementById("costs-edit-process-modal");
    if (modalEl) modalEl.remove();
};

window.guardarEditarProcesoModal = function(index) {
    const row = costsState?.general?.processDefaults?.[index];
    if (!row) return;

    const labelVal = document.getElementById("modal-proc-label")?.value?.trim();
    const orderVal = Number(document.getElementById("modal-proc-order")?.value || 0);
    const colorVal = document.getElementById("modal-proc-color")?.value;
    const paraleloVal = Boolean(document.getElementById("modal-proc-paralelo")?.checked);
    const turnoVal = Boolean(document.getElementById("modal-proc-turno")?.checked);
    const ganttVal = Boolean(document.getElementById("modal-proc-gantt")?.checked);
    const calendarioVal = document.getElementById("modal-proc-calendario")?.value || null;

    if (labelVal) row.label = labelVal;
    if (orderVal > 0) row.order = orderVal;
    if (colorVal) row.colorGantt = colorVal;
    row.procesoParalelo = paraleloVal;
    row.terminarEnTurno = turnoVal;
    row.ganttEnabled = ganttVal;
    row.calendarioId = calendarioVal;

    closeEditarProcesoModal();
    syncProcessDefaultOrders();
    renderProcessDefaultRows();
    queueCostsSave();
};

window.agregarMaquinaModalProceso = async function(procesoKey, index) {
    const maquinaSelect = document.getElementById("modal-nueva-maquina-select");
    const calSelect = document.getElementById("modal-nueva-maquina-calendario");
    const maquinaId = maquinaSelect?.value;
    const calendarioId = calSelect?.value || null;
    if (!maquinaId) {
        alert("Debes seleccionar una máquina para asignar.");
        return;
    }
    try {
        const res = await fetch(`/api/costos/procesos/${encodeURIComponent(procesoKey)}/maquinas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ maquina_id: maquinaId, calendario_id: calendarioId })
        });
        const data = await res.json();
        if (data.ok) {
            await loadCostsProcesosMaquinas();
            renderProcessDefaultRows();
            openEditarProcesoModal(index);
        } else {
            alert(data.error || "No fue posible asignar la máquina.");
        }
    } catch (e) {
        alert("Ocurrió un error al asignar la máquina.");
    }
};

window.quitarMaquinaModalProceso = async function(procesoKey, asignacionId, index) {
    if (!confirm("¿Deseas quitar esta máquina del proceso?")) return;
    try {
        const res = await fetch(`/api/costos/procesos/${encodeURIComponent(procesoKey)}/maquinas/${encodeURIComponent(asignacionId)}`, {
            method: "DELETE"
        });
        const data = await res.json();
        if (data.ok) {
            await loadCostsProcesosMaquinas();
            renderProcessDefaultRows();
            openEditarProcesoModal(index);
        } else {
            alert(data.error || "No fue posible quitar la máquina.");
        }
    } catch (e) {
        alert("Ocurrió un error al quitar la máquina.");
    }
};

init();
