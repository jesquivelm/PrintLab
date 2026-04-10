const params = new URLSearchParams(window.location.search);

const PRODUCT_TYPES = ["Etiquetas", "Cinta Continua", "Empaque Flexible", "Código de Barras", "Números de Carrera"];
const WORK_TYPES = ["Nuevo", "Repetición", "Repetición con Cambio", "Prueba", "Muestra", "Regalía", "Proyecto"];
const DEFAULT_OUTPUT_TYPES = [
  { id: "A", name: "A", description: "Configuracion de salida tipo A" },
  { id: "B", name: "B", description: "Configuracion de salida tipo B" },
  { id: "C", name: "C", description: "Configuracion de salida tipo C" },
  { id: "D", name: "D", description: "Configuracion de salida tipo D" },
  { id: "E", name: "E", description: "Configuracion de salida tipo E" },
  { id: "F", name: "F", description: "Configuracion de salida tipo F" },
  { id: "G", name: "G", description: "Configuracion de salida tipo G" },
  { id: "H", name: "H", description: "Configuracion de salida tipo H" },
  { id: "INDIFERENTE", name: "IND", shortName: "IND", description: "La salida puede definirse mas adelante" }
];
const PLATE_KEYS = [
  { key: "laser", label: "Grabado laser", machine: "CDI Esko", keywords: ["grabado", "laser", "cdi"] },
  { key: "develop", label: "Revelado", machine: "Procesadora", keywords: ["revelado", "revel"] },
  { key: "clean", label: "Limpieza", machine: "Limpieza", keywords: ["limpieza"] },
  { key: "dry", label: "Secado / curado", machine: "Secado / curado", keywords: ["secado", "curado"] }
];
const INLINE_PRINT_SLOTS = [
  { key: "barniz", label: "Barniz", keywords: ["barniz"], materialFamily: "barniz", materialKeywords: ["barniz"] },
  { key: "laminado", label: "Laminado", keywords: ["laminado"], materialFamily: "laminado", materialKeywords: ["laminado", "laminante", "overtape", "arclad", "graf depot"], usesMaterial: true },
  { key: "estampado", label: "Estampado", keywords: ["estampado", "foil"], materialFamily: "foil", materialKeywords: ["foil", "stamp", "estamp"], usesMaterial: true, usesPlateCost: true },
  { key: "embosado", label: "Embosado", keywords: ["embosado", "relieve", "emboss"], usesPlateCost: true },
  { key: "troquelado", label: "Troquelado", keywords: ["troquel"] },
  { key: "numerado", label: "Numerado", keywords: ["numerado", "numero"] }
];
const EXTERNAL_FINISH_SLOTS = [
  { key: "barnizado", label: "Barnizado", keywords: ["barnizado", "barniz"], materialFamily: "barniz", materialKeywords: ["barniz"], usesMaterial: true, usesWeightMaterial: true },
  { key: "laminado", label: "Laminado", keywords: ["laminado"], materialFamily: "laminado", materialKeywords: ["laminado", "laminante", "overtape", "arclad", "graf depot"], usesMaterial: true },
  { key: "estampado", label: "Estampado", keywords: ["estampado", "foil"], materialFamily: "foil", materialKeywords: ["foil", "stamp", "estamp"], usesMaterial: true, usesPlateCost: true },
  { key: "embosado", label: "Embosado", keywords: ["embosado", "relieve", "emboss"], usesPlateCost: true },
  { key: "troquelado", label: "Troquelado", keywords: ["troquel"] },
  { key: "rebobinado", label: "Rebobinado", keywords: ["rebob"] }
];
const EXTERNAL_FINISH_BY_KEY = Object.fromEntries(EXTERNAL_FINISH_SLOTS.map((item) => [item.key, item]));
const INLINE_PRINT_BY_KEY = Object.fromEntries(INLINE_PRINT_SLOTS.map((item) => [item.key, item]));
const PROCESS_MENU = [
  { key: "macula", label: "Mácula", locked: true, repeatable: false, helper: "Base de desperdicio obligatoria", order: 5 },
  { key: "troquel", label: "Troquel", locked: true, repeatable: false, helper: "Base tecnica obligatoria", order: 10 },
  { key: "sustrato", label: "Sustrato", locked: true, repeatable: false, helper: "Material base obligatorio", order: 20 },
  { key: "diseno", label: "Diseño", locked: false, repeatable: false, helper: "Arte y cambios", order: 30 },
  { key: "preprensa", label: "Preprensa", locked: true, repeatable: false, helper: "Preparación técnica obligatoria", order: 40 },
  { key: "planchas", label: "Planchas", locked: false, repeatable: false, helper: "Subprocesos de plancha", order: 50 },
  { key: "impresion", label: "Impresión", locked: false, repeatable: true, helper: "Puedes agregar varias", order: 60 },
  { key: "barnizado", label: "Barnizado", locked: false, repeatable: false, helper: "Proceso aparte", order: 69 },
  { key: "laminado", label: "Laminado", locked: false, repeatable: false, helper: "Proceso aparte", order: 70 },
  { key: "estampado", label: "Estampado", locked: false, repeatable: false, helper: "Proceso aparte", order: 71 },
  { key: "embosado", label: "Embosado", locked: false, repeatable: false, helper: "Proceso aparte", order: 71.5 },
  { key: "troquelado", label: "Troquelado", locked: false, repeatable: false, helper: "Proceso aparte", order: 72 },
  { key: "rebobinado", label: "Rebobinado", locked: false, repeatable: false, helper: "Proceso aparte", order: 73 },
  { key: "empaque", label: "Empaque", locked: false, repeatable: false, helper: "Salida final", order: 80 },
  { key: "adicionales", label: "Procesos adicionales", locked: false, repeatable: false, helper: "Costos manuales", order: 90 }
];
const PROCESS_MENU_BY_KEY = Object.fromEntries(PROCESS_MENU.map((item) => [item.key, item]));
const PROCESS_LAUNCHER_STORAGE_KEY = "erp-flexo-process-launcher-position";
const FAVORITE_DOCUMENTS_STORAGE_KEY = "erp-favorite-documents";

let printStageCounter = 0;

const els = {
  companyLogo: document.getElementById("companyLogo"),
  brandFallback: document.getElementById("brandFallback"),
  pageTitle: document.getElementById("pageTitle"),
  customerNameDisplay: document.getElementById("customerNameDisplay"),
  salespersonDisplay: document.getElementById("salespersonDisplay"),
  favoriteDocumentButton: document.getElementById("favoriteDocumentButton"),
  favoriteDocumentIcon: document.getElementById("favoriteDocumentIcon"),
  refreshCostsButton: document.getElementById("refreshCostsButton"),
  refreshCostsIcon: document.getElementById("refreshCostsIcon"),
  customerCode: document.getElementById("customerCode"),
  customerName: document.getElementById("customerName"),
  productType: document.getElementById("productType"),
  jobName: document.getElementById("jobName"),
  salespersonName: document.getElementById("salespersonName"),
  workType: document.getElementById("workType"),
  labelWidthIn: document.getElementById("labelWidthIn"),
  labelHeightIn: document.getElementById("labelHeightIn"),
  rollWidthIn: document.getElementById("rollWidthIn"),
  coreDiameter: document.getElementById("coreDiameter"),
  labelsPerRoll: document.getElementById("labelsPerRoll"),
  applicationType: document.getElementById("applicationType"),
  applicationEnvironment: document.getElementById("applicationEnvironment"),
  surfaceType: document.getElementById("surfaceType"),
  outputType: document.getElementById("outputType"),
  outputTypePreview: document.getElementById("outputTypePreview"),
  quantityRepeater: document.getElementById("quantityRepeater"),
  processLauncherShell: document.getElementById("processLauncherShell"),
  processLauncherPrimary: document.getElementById("processLauncherPrimary"),
  processLauncherBridge: document.getElementById("processLauncherBridge"),
  processLauncherButton: document.getElementById("processLauncherButton"),
  processLauncherIcon: document.getElementById("processLauncherIcon"),
  processLauncherLabel: document.getElementById("processLauncherLabel"),
  processLauncherMenu: document.getElementById("processLauncherMenu"),
  timelineLauncherPrimary: document.getElementById("timelineLauncherPrimary"),
  timelineLauncherBridge: document.getElementById("timelineLauncherBridge"),
  timelineLauncherButton: document.getElementById("timelineLauncherButton"),
  timelineLauncherIcon: document.getElementById("timelineLauncherIcon"),
  timelineLauncherLabel: document.getElementById("timelineLauncherLabel"),
  timelineLauncherPanel: document.getElementById("timelineLauncherPanel"),
  timelineReportDialog: document.getElementById("timelineReportDialog"),
  timelineReportClose: document.getElementById("timelineReportClose"),
  timelineReportCancel: document.getElementById("timelineReportCancel"),
  timelineReportSubmit: document.getElementById("timelineReportSubmit"),
  timelineReportSeller: document.getElementById("timelineReportSeller"),
  timelineReportCustomer: document.getElementById("timelineReportCustomer"),
  timelineReportQuote: document.getElementById("timelineReportQuote"),
  timelineReportLine: document.getElementById("timelineReportLine"),
  timelineReportJob: document.getElementById("timelineReportJob"),
  timelineReportIssue: document.getElementById("timelineReportIssue"),
  quantityTypes: document.getElementById("quantityTypes"),
  quantityChanges: document.getElementById("quantityChanges"),
  pantoneCount: document.getElementById("pantoneCount"),
  useCmyk: document.getElementById("useCmyk"),
  useWhiteInk: document.getElementById("useWhiteInk"),
  doubleWhitePass: document.getElementById("doubleWhitePass"),
  noPrint: document.getElementById("noPrint"),
  processSections: document.getElementById("processSections"),
  calcStatus: document.getElementById("calcStatus"),
  contextRows: document.getElementById("contextRows"),
  overheadPct: document.getElementById("overheadPct"),
  marginPct: document.getElementById("marginPct"),
  taxPct: document.getElementById("taxPct"),
  summaryRows: document.getElementById("summaryRows")
};

const state = {
  config: null,
  context: null,
  costsConfig: null,
  catalogs: { materials: [], troqueles: [], machines: [], machineCategories: {}, processes: [] },
  form: null,
  notifications: [],
  saveTimer: null,
  saving: false,
  processOpen: {},
  draggingProcessKey: "",
  launcherDrag: null,
  suppressLauncherClick: false
};

const QUANTITY_LAYOUT = {
  normalWidth: 126,
  lastInputWidth: 126,
  addButtonWidth: 42,
  trashButtonWidth: 34,
  gap: 8,
  lastGap: 8
};
const MM_PER_INCH = 25.4;

function n(value, fallback = 0) {
  const normalized = String(value ?? "").replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numericValue(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  return n(value, fallback);
}

function r(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function toIconSuffix(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function iconPresentation(key, fallbackValue, fallbackColor, fallbackSize) {
  const suffix = toIconSuffix(key);
  const general = state.config?.general || {};
  return {
    value: first(state.config?.icons?.[key], fallbackValue),
    color: first(general[`iconColor${suffix}`], fallbackColor),
    hover: first(general[`iconColorHover${suffix}`], fallbackColor),
    size: Number(first(general[`iconSize${suffix}`], fallbackSize)) || fallbackSize
  };
}

function applyIconToContainer(container, iconValue, label, className = "floating-action-icon-markup") {
  if (!container) return;
  container.innerHTML = renderIconMarkup(iconValue, label, className);
}

function formatTimelineStamp(value) {
  if (!value) return "Pendiente";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(parsed);
}

function buildTimelineEntries() {
  const context = state.context?.calculo || null;
  const quote = state.context?.cotizacion || null;
  const raw = context?.raw_data || {};
  const currentUser = first(state.config?.session?.currentUser, state.config?.general?.currentUser, "admin");
  const latestNotification = Array.isArray(state.notifications) && state.notifications.length ? state.notifications[0] : null;
  const sellerName = first(quote?.salesperson_name, context?.salespersonName, "Jorge Esquivel");
  return [
    {
      key: "created",
      title: "Creación",
      stamp: first(quote?.created_on, raw["FECHA CREACION DATE"], raw["FECHA CREACION"], raw["TRAZABILIDAD | FECHA"]),
      user: first(raw["TRAZABILIDAD | USUARIO"], sellerName, currentUser),
      role: "VENDEDOR",
      detail: "Se registró la cotización",
      comment: ""
    },
    {
      key: "requested",
      title: "Solicitud",
      stamp: first(raw["SOLICITUD COTIZACION | FECHA"], raw["SOLICITUD | FECHA"], raw["SOLICITUD FECHA"], ""),
      user: first(raw["SOLICITUD COTIZACION | USUARIO"], raw["SOLICITUD USUARIO"], sellerName, "Jorge Esquivel"),
      role: "VENDEDOR",
      detail: "Solicitó la cotización",
      comment: first(raw["OBSERVACIONES SOLICITUD"], latestNotification?.issueText, "")
    },
    {
      key: "answered",
      title: "Respuesta",
      stamp: first(raw["FIN COTIZACION | FECHA"], raw["RESPUESTA COTIZADOR | FECHA"], latestNotification?.createdAt, ""),
      user: first(raw["FIN COTIZACION | USUARIO"], raw["RESPUESTA COTIZADOR | USUARIO"], currentUser, "Cotizador"),
      role: "COTIZADOR",
      detail: first(latestNotification ? "Reportó observación al vendedor" : "", "Elaborando cotización"),
      comment: latestNotification?.issueText || ""
    }
  ];
}

function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

async function loadLineNotifications() {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  if (!quoteCode || !lineCode) {
    state.notifications = [];
    return;
  }
  try {
    const payload = await getJson(`/api/flexo/notificaciones?${new URLSearchParams({ quoteCode, lineCode }).toString()}`);
    state.notifications = Array.isArray(payload.items) ? payload.items : [];
  } catch (error) {
    state.notifications = [];
  }
}

function openTimelineReportDialog() {
  if (!els.timelineReportDialog) return;
  const quoteCode = state.form?.header?.quoteCode || "";
  const lineCode = state.form?.header?.lineCode || "";
  els.timelineReportSeller.value = state.form?.header?.salespersonName || "Jorge Esquivel";
  els.timelineReportCustomer.value = state.form?.header?.customerName || "";
  els.timelineReportQuote.value = quoteCode;
  els.timelineReportLine.value = lineCode;
  els.timelineReportJob.value = state.form?.header?.jobName || "";
  els.timelineReportIssue.value = "";
  els.timelineReportDialog.showModal();
}

async function submitTimelineNotification() {
  const issueText = String(els.timelineReportIssue?.value || "").trim();
  if (!issueText) {
    els.calcStatus.textContent = "Debes indicar el problema detectado antes de enviar la notificación.";
    return;
  }
  const payload = {
    quoteCode: state.form?.header?.quoteCode || "",
    lineCode: state.form?.header?.lineCode || "",
    sellerName: state.form?.header?.salespersonName || "Jorge Esquivel",
    customerName: state.form?.header?.customerName || "",
    jobName: state.form?.header?.jobName || "",
    issueText,
    targetUser: "Jorge Esquivel",
    actor: first(state.config?.session?.currentUser, state.config?.general?.currentUser, "Cotizador"),
    snapshot: {
      quoteCode: state.form?.header?.quoteCode || "",
      lineCode: state.form?.header?.lineCode || "",
      customerName: state.form?.header?.customerName || "",
      salespersonName: state.form?.header?.salespersonName || "",
      jobName: state.form?.header?.jobName || "",
      lineStatus: state.form?.header?.lineStatus || ""
    }
  };
  await postJson("/api/flexo/notificaciones", payload);
  await loadLineNotifications();
  renderTimelineLauncher();
  els.timelineReportDialog?.close();
  els.calcStatus.textContent = "Notificación enviada al vendedor.";
}

function buildFavoriteDocumentRecord() {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  if (!quoteCode || !lineCode) return null;
  const url = new URL(window.location.href);
  url.searchParams.delete("shell");
  return {
    id: `${quoteCode}::${lineCode}`,
    quoteCode,
    lineCode,
    customerName: String(state.form?.header?.customerName || "").trim(),
    jobName: String(state.form?.header?.jobName || "").trim(),
    route: `${url.pathname}${url.search}${url.hash}`,
    label: `Cotización ${quoteCode} / ${lineCode}`,
    updatedAt: Date.now()
  };
}

function readFavoriteDocuments() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITE_DOCUMENTS_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((item) => item && item.id && item.route) : [];
  } catch (error) {
    return [];
  }
}

function writeFavoriteDocuments(items) {
  localStorage.setItem(FAVORITE_DOCUMENTS_STORAGE_KEY, JSON.stringify(items));
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "erp-favorites-updated" }, window.location.origin);
    }
  } catch (error) {
    // Ignore cross-frame refresh errors for favorites.
  }
}

function isCurrentDocumentFavorite() {
  const current = buildFavoriteDocumentRecord();
  if (!current) return false;
  return readFavoriteDocuments().some((item) => item.id === current.id);
}

function renderFavoriteDocumentButton() {
  if (!els.favoriteDocumentButton || !els.favoriteDocumentIcon) return;
  const current = buildFavoriteDocumentRecord();
  const isFavorite = current ? isCurrentDocumentFavorite() : false;
  const iconState = isFavorite
    ? iconPresentation("favoriteDocumentOn", "★", "#c79b18", 20)
    : iconPresentation("favoriteDocumentOff", "☆", "#a2aab5", 20);
  els.favoriteDocumentButton.disabled = !current;
  els.favoriteDocumentButton.classList.toggle("is-active", isFavorite);
  els.favoriteDocumentButton.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  els.favoriteDocumentButton.title = current
    ? (isFavorite ? "Quitar de favoritos" : "Marcar como favorito")
    : "Guarda primero una cotización válida para marcarla";
  els.favoriteDocumentButton.style.setProperty("--floating-icon-color", iconState.color);
  els.favoriteDocumentButton.style.setProperty("--floating-icon-hover", iconState.hover);
  els.favoriteDocumentButton.style.setProperty("--floating-icon-size", `${iconState.size}px`);
  applyIconToContainer(els.favoriteDocumentIcon, iconState.value, isFavorite ? "Favorito activo" : "Favorito inactivo");
}

function toggleFavoriteDocument() {
  const current = buildFavoriteDocumentRecord();
  if (!current) return;
  const favorites = readFavoriteDocuments();
  const index = favorites.findIndex((item) => item.id === current.id);
  if (index >= 0) favorites.splice(index, 1);
  else favorites.unshift(current);
  writeFavoriteDocuments(favorites.slice(0, 24));
  renderFavoriteDocumentButton();
}

function applyCostsConfigToCurrentLine(force = false) {
  const maculaConfig = defaultMaculaConfig();
  state.form.macula = {
    source: maculaConfig.source,
    montajeRows: normalizeMaculaMontajeRows(maculaConfig.montajeRows),
    tirajeRows: normalizeMaculaTirajeRows(maculaConfig.tirajeRows)
  };

  const inkDefaults = conventionalInkDefaults();
  const applyStageDefaults = (stage) => {
    if (!stage || typeof stage !== "object") return;
    stage.coveragePct = force ? inkDefaults.cmykCoveragePct : (n(stage.coveragePct, 0) > 0 ? n(stage.coveragePct, 0) : inkDefaults.cmykCoveragePct);
    stage.aniloxBcm = force ? (inkDefaults.cmykBcm || inkDefaults.bcmGenerico) : (n(stage.aniloxBcm, 0) > 0 ? n(stage.aniloxBcm, 0) : (inkDefaults.cmykBcm || inkDefaults.bcmGenerico));
    stage.inkGsm = force ? inkDefaults.cmykGsm : (n(stage.inkGsm, 0) > 0 ? n(stage.inkGsm, 0) : inkDefaults.cmykGsm);
    stage.bcmGenerico = force ? inkDefaults.bcmGenerico : (n(stage.bcmGenerico, 0) > 0 ? n(stage.bcmGenerico, 0) : inkDefaults.bcmGenerico);
    stage.transferFactor = force ? 0.3 : (n(stage.transferFactor, 0) > 0 ? n(stage.transferFactor, 0) : 0.3);
    stage.inkDensity = force ? inkDefaults.densidadUv : (n(stage.inkDensity, 0) > 0 ? n(stage.inkDensity, 0) : inkDefaults.densidadUv);
    stage.inkCostPerLb = force ? inkDefaults.costoLbCmyk : (n(stage.inkCostPerLb, 0) > 0 ? n(stage.inkCostPerLb, 0) : inkDefaults.costoLbCmyk);
    stage.whiteInkCostPerLb = force ? inkDefaults.costoLbBlanco : (n(stage.whiteInkCostPerLb, 0) > 0 ? n(stage.whiteInkCostPerLb, 0) : inkDefaults.costoLbBlanco);
    stage.pantoneInkCostPerLb = force ? inkDefaults.costoLbPantone : (n(stage.pantoneInkCostPerLb, 0) > 0 ? n(stage.pantoneInkCostPerLb, 0) : inkDefaults.costoLbPantone);
    stage.designCoveragePct = force ? inkDefaults.coberturaDisenoPct : (n(stage.designCoveragePct, 0) > 0 ? n(stage.designCoveragePct, 0) : inkDefaults.coberturaDisenoPct);
    stage.inkProfiles = inkDefaults.depositos.map((item, index) => ({
      id: first(item?.id, `deposito-${index + 1}`),
      tipo: first(item?.tipo, ""),
      bcm: n(item?.bcm, 0),
      coveragePct: n(item?.coveragePct, 0),
      gsm: n(item?.gsm, 0)
    }));
    INLINE_PRINT_SLOTS.forEach((slot) => {
      const inline = stage.inlineFinishes?.[slot.key];
      if (!inline) return;
      inline.setupMinutes = force ? inlineFinishSetupMinutes(slot.key) : (n(inline.setupMinutes, 0) > 0 ? n(inline.setupMinutes, 0) : inlineFinishSetupMinutes(slot.key));
      if (slot.key === "barniz") {
        inline.coveragePct = force ? inkDefaults.barnizCoveragePct : (n(inline.coveragePct, 0) > 0 ? n(inline.coveragePct, 0) : inkDefaults.barnizCoveragePct);
        inline.layerGsm = force ? inkDefaults.barnizGsm : (n(inline.layerGsm, 0) > 0 ? n(inline.layerGsm, 0) : inkDefaults.barnizGsm);
      }
    });
  };
  const applyFinishWaste = (finish) => {
    if (!finish || typeof finish !== "object") return;
    const wasteDefaults = finishWasteDefault(finish.processKey);
    finish.setupWasteFeet = wasteDefaults.setupWasteFeet;
    finish.operationWastePct = wasteDefaults.operationWastePct;
  };

  applyStageDefaults(state.form.print);
  activePrintStages().forEach(applyStageDefaults);
  (state.form.finishes || []).forEach(applyFinishWaste);
  syncPrimaryPrintStage();
}

async function refreshCostsForCurrentLine() {
  if (!els.refreshCostsButton) return;
  const confirmed = window.confirm("Esto actualizará los costos y parámetros de esta línea con la configuración vigente. ¿Deseas continuar?");
  if (!confirmed) return;
  try {
    els.refreshCostsButton.classList.add("is-loading");
    els.refreshCostsButton.disabled = true;
    const costsConfig = await getJson("/api/costos-config");
    state.costsConfig = costsConfig;
    applyCostsConfigToCurrentLine(true);
    activePrintStages().forEach((stage, stageIndex) => {
      INLINE_PRINT_SLOTS.forEach((slot) => {
        if (stage?.inlineFinishes?.[slot.key]?.active) applyInlineFinishSetupDefaults(stageIndex, slot.key, true);
      });
    });
    renderProcesses();
    scheduleSave();
    els.calcStatus.textContent = "Costos actualizados en la línea actual.";
  } catch (error) {
    els.calcStatus.textContent = error.message || "No fue posible actualizar los costos.";
  } finally {
    els.refreshCostsButton.classList.remove("is-loading");
    els.refreshCostsButton.disabled = false;
  }
}

function num(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits }).format(Number(value || 0));
}

function formatInteger(value) {
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.max(0, Math.trunc(Number(value || 0))));
}

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function norm(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function first(...values) {
  for (const value of values) if (value !== undefined && value !== null && value !== "") return value;
  return "";
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function mmToInches(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return r(parsed / MM_PER_INCH, 4);
}

function normalizeElongationPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed <= 1.5 ? r(parsed * 100, 4) : r(parsed, 4);
}

function elongationFactor(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed <= 1.5 ? parsed : parsed / 100;
}

function resolveDieMetrics(die = {}, context = {}) {
  const mountWidthIn = firstPositiveNumber(
    die.ancho_total_troquel_in,
    die.anchoEtiquetaIn,
    die.anchoMontaje,
    die.ancho_montaje,
    die.mountWidthIn,
    die.mount_width_in,
    die.widthInches,
    die.anchoEtiqueta,
    die.anchoTroquel
  ) || mmToInches(firstPositiveNumber(die.ancho_mm, die.widthMm));
  const mountLengthIn = firstPositiveNumber(
    die.largo_total_troquel_in,
    die.largoEtiquetaIn,
    die.largoMontaje,
    die.largo_montaje,
    die.mountLengthIn,
    die.mount_length_in,
    die.lengthInches,
    die.largoEtiqueta,
    die.largoTroquel
  ) || mmToInches(firstPositiveNumber(die.largo_mm, die.lengthMm));
  const rows = n(firstPositiveNumber(die.filas, die.cantidad_filas, die.rows, context?.dieRows), 0);
  const repetitions = n(firstPositiveNumber(die.repeticiones, die.repetitions, context?.dieRepeats), 0);
  const elongationPct = normalizeElongationPercent(first(
    die.elongacionPct,
    die.elongacion_pct,
    die.elongacion,
    die.distorsionPct,
    die.distorsion_pct,
    die.distortionPct,
    die.distortion,
    context?.dieElongation
  ));
  const materialWidthIn = firstPositiveNumber(die.anchoMaterialIn, die.ancho_material_in, die.materialWidthIn) || 0;
  const cylinderDevelopmentIn = firstPositiveNumber(
    die.desarrolloTotalIn,
    die.desarrollo_total_in,
    die.desarrollo_in,
    die.desarrolloIn,
    die.desarrollo,
    die.repeatIn,
    die.repeat_in,
    die.cylinderDevelopmentIn,
    die.cylinder_development_in,
    context?.dieDevelopment
  ) || r(mountLengthIn * Math.max(1, repetitions), 4);
  const acrossCount = n(firstPositiveNumber(
    die.across,
    die.acrossCount,
    die.across_count,
    die.filas,
    die.rows,
    context?.dieRows
  ), 0);

  return {
    dieCode: first(die.codigoTroquel, die.codigo, die.id, context?.dieCode, ""),
    dieDescription: first(die.descripcion, die.description, die.codigoTroquel, die.codigo, die.id, context?.dieCode, "No definido"),
    widthIn: r(mountWidthIn, 4),
    lengthIn: r(mountLengthIn, 4),
    mountWidthIn: r(mountWidthIn, 4),
    mountLengthIn: r(mountLengthIn, 4),
    cylinderDevelopmentIn: r(cylinderDevelopmentIn, 4),
    acrossCount,
    elongationPct,
    materialWidthIn: r(materialWidthIn, 4),
    teeth: n(firstPositiveNumber(die.dientes, die.teeth, context?.dieTeeth), 0),
    repeats: repetitions,
    rows
  };
}

function outputTypesCatalog() {
  const dynamic = Array.isArray(state.catalogs?.outputTypes) ? state.catalogs.outputTypes.filter((item) => item && item.active !== false) : [];
  return dynamic.length ? dynamic : DEFAULT_OUTPUT_TYPES;
}

function isSvgValue(value) {
  return String(value || "").trim().toLowerCase().startsWith("data:image/svg+xml") || String(value || "").trim().toLowerCase().endsWith(".svg");
}

function isImageValue(value) {
  const source = String(value || "").trim().toLowerCase();
  return source.startsWith("data:image/") || source.endsWith(".png") || source.endsWith(".svg") || source.endsWith(".jpg") || source.endsWith(".jpeg") || source.endsWith(".webp");
}

function renderIconMarkup(value, altText, className = "") {
  if (isSvgValue(value)) {
    const safeUrl = esc(value);
    return `<span class="icon-svg-mask ${className}" role="img" aria-label="${esc(altText)}" style="-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');"></span>`;
  }
  if (isImageValue(value)) {
    return `<img src="${esc(value)}" alt="${esc(altText)}" class="icon-image ${className}">`;
  }
  return `<span class="icon-glyph ${className}" aria-hidden="true">${esc(value || "")}</span>`;
}

function getLineDeleteIconConfig() {
  const icons = state.config?.icons || {};
  const general = state.config?.general || {};
  return {
    value: icons.lineDelete || "✕",
    primary: general.iconColorLineDelete || "#a74343",
    secondary: general.iconColor2LineDelete || "#ffffff",
    hover: general.iconColorHoverLineDelete || "#d03535",
    size: Number(general.iconSizeLineDelete) || 18
  };
}

function getQuantityAddIconConfig() {
  const icons = state.config?.icons || {};
  const general = state.config?.general || {};
  return {
    value: icons.quantityAdd || "+",
    primary: general.iconColorQuantityAdd || "#738196",
    secondary: general.iconColor2QuantityAdd || "#ffffff",
    hover: general.iconColorHoverQuantityAdd || "#0b81b8",
    size: Number(general.iconSizeQuantityAdd) || 20
  };
}

function getQuantityCapacity() {
  const containerWidth = Math.max(0, els.quantityRepeater?.clientWidth || 0);
  if (!containerWidth) return 1;
  let count = 1;
  while (true) {
    const width = ((count - 1) * QUANTITY_LAYOUT.normalWidth)
      + QUANTITY_LAYOUT.lastInputWidth
      + QUANTITY_LAYOUT.addButtonWidth
      + QUANTITY_LAYOUT.trashButtonWidth
      + (count - 1) * QUANTITY_LAYOUT.gap
      + QUANTITY_LAYOUT.lastGap;
    if (width > containerWidth) {
      return Math.max(1, count - 1);
    }
    count += 1;
    if (count > 30) return 30;
  }
}

function stateSafeMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    if (Array.isArray(sourceValue)) {
      target[key] = sourceValue.map((item) => (item && typeof item === "object" ? JSON.parse(JSON.stringify(item)) : item));
      return;
    }
    if (sourceValue && typeof sourceValue === "object") {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) target[key] = {};
      stateSafeMerge(target[key], sourceValue);
      return;
    }
    target[key] = sourceValue;
  });
  return target;
}

function createPrintStageId() {
  printStageCounter += 1;
  return `print-stage-${printStageCounter}`;
}

function normalizeMaculaMontajeRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: first(row?.id, `macula-montaje-${index + 1}`),
    detalle: first(row?.detalle, ""),
    porEstacion: n(row?.porEstacion, 0),
    cantidadTintas: n(row?.cantidadTintas, 0),
    totalPies: n(row?.totalPies, 0)
  }));
}

function normalizeMaculaTirajeRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: first(row?.id, `macula-tiraje-${index + 1}`),
    detalle: first(row?.detalle, ""),
    porcentaje: n(row?.porcentaje, 0)
  }));
}

function defaultMaculaConfig() {
  const processText = norm(`${state.context?.calculo?.processType || ""} ${state.context?.cotizacion?.process_type || ""}`);
  const variant = processText.includes("digital") ? "digital" : "convencional";
  const fallback = state.costsConfig?.convencional || { maculaMontaje: [], maculaTiraje: [] };
  const source = state.costsConfig?.[variant] || fallback;
  return {
    source: variant,
    montajeRows: normalizeMaculaMontajeRows(source.maculaMontaje || fallback.maculaMontaje),
    tirajeRows: normalizeMaculaTirajeRows(source.maculaTiraje || fallback.maculaTiraje)
  };
}

function conventionalInkDefaults() {
  const defaults = state.costsConfig?.convencional?.tintaGeneral || {};
  const depositos = Array.isArray(defaults.depositos) ? defaults.depositos : [];
  const cmykDeposito = depositos.find((item) => norm(item?.tipo).includes("cmyk")) || null;
  const barnizDeposito = depositos.find((item) => norm(item?.tipo).includes("barniz")) || null;
  const inferCoveragePct = (item, fallback) => {
    if (item?.coveragePct !== undefined && item?.coveragePct !== null && item?.coveragePct !== "") {
      return n(item.coveragePct, fallback);
    }
    const tipo = norm(item?.tipo);
    if (tipo.includes("barniz")) return 100;
    if (tipo.includes("solido") || tipo.includes("blanco")) return 100;
    if (tipo.includes("texto") || tipo.includes("linea")) return 10;
    if (tipo.includes("cmyk") || tipo.includes("policrom")) return 25;
    return fallback;
  };
  return {
    bcmGenerico: n(defaults.bcmGenerico, 2),
    coberturaTintaPct: n(defaults.coberturaTintaPct, 30),
    coberturaDisenoPct: n(defaults.coberturaDisenoPct, 60),
    densidadUv: n(defaults.densidadUv, 1.5),
    costoLbCmyk: n(defaults.costoLbCmyk, 25),
    costoLbBlanco: n(defaults.costoLbBlanco, 30),
    costoLbPantone: n(defaults.costoLbPantone, 35),
    cmykBcm: n(cmykDeposito?.bcm, n(defaults.bcmGenerico, 2)),
    cmykCoveragePct: inferCoveragePct(cmykDeposito, n(defaults.coberturaTintaPct, 30)),
    cmykGsm: n(cmykDeposito?.gsm, 1),
    barnizBcm: n(barnizDeposito?.bcm, 7),
    barnizCoveragePct: inferCoveragePct(barnizDeposito, 100),
    barnizGsm: n(barnizDeposito?.gsm, 3),
    depositos: depositos.map((item, index) => ({
      id: first(item?.id, `deposito-${index + 1}`),
      tipo: first(item?.tipo, ""),
      bcm: n(item?.bcm, 0),
      coveragePct: inferCoveragePct(item, n(defaults.coberturaTintaPct, 30)),
      gsm: n(item?.gsm, 0)
    }))
  };
}

function inlineFinishSetupMinutes(processKey = "") {
  const rows = state.costsConfig?.convencional?.inlineFinishSetup || [];
  const target = normalizeMaculaProcessKey(processKey);
  const row = rows.find((item) => normalizeMaculaProcessKey(item?.proceso) === target)
    || rows.find((item) => target.includes(normalizeMaculaProcessKey(item?.proceso)))
    || rows.find((item) => normalizeMaculaProcessKey(item?.proceso).includes(target));
  return n(row?.minutosPorEstacion, 5);
}

function applyInlineFinishSetupDefaults(stageIndex, inlineKey, force = false) {
  const stage = state.form?.printStages?.[stageIndex];
  const inline = stage?.inlineFinishes?.[inlineKey];
  if (!inline) return;
  const inkDefaults = conventionalInkDefaults();
  inline.setupMinutes = force || n(inline.setupMinutes, 0) <= 0
    ? inlineFinishSetupMinutes(inlineKey)
    : n(inline.setupMinutes, 0);
  if (inlineKey === "barniz") {
    inline.coveragePct = force || n(inline.coveragePct, 0) <= 0
      ? inkDefaults.barnizCoveragePct
      : n(inline.coveragePct, 0);
    inline.layerGsm = force || n(inline.layerGsm, 0) <= 0
      ? inkDefaults.barnizGsm
      : n(inline.layerGsm, 0);
  }
}

function finishWasteDefault(processKey = "") {
  const rows = state.costsConfig?.convencional?.finishWaste || [];
  const target = norm(processKey);
  const row = rows.find((item) => norm(item?.proceso).includes(target))
    || rows.find((item) => target.includes(norm(item?.proceso)));
  return {
    setupWasteFeet: n(row?.setupWasteFeet, 0),
    operationWastePct: n(row?.operationWastePct, 0)
  };
}

function sortActiveProcessKeys(keys = []) {
  return [...new Set(keys.filter((key) => PROCESS_MENU_BY_KEY[key]))]
    .sort((left, right) => (PROCESS_MENU_BY_KEY[left]?.order || 999) - (PROCESS_MENU_BY_KEY[right]?.order || 999));
}

function ensureActiveProcessKeys(expanded = false) {
  const current = Array.isArray(state.form.activeProcessKeys) ? state.form.activeProcessKeys : [];
  const required = ["macula", "troquel", "sustrato", "preprensa"];
  const next = sortActiveProcessKeys(expanded ? current.concat(required, ["diseno", "planchas", "impresion", "barnizado", "laminado", "estampado", "embosado", "troquelado", "rebobinado", "empaque", "adicionales"]) : current.concat(required));
  state.form.activeProcessKeys = next;
}

function hasActiveProcess(key) {
  return Array.isArray(state.form.activeProcessKeys) && state.form.activeProcessKeys.includes(key);
}

function activePrintStages() {
  return Array.isArray(state.form.printStages) ? state.form.printStages : [];
}

function createPrintStage(base = {}) {
  const inkDefaults = conventionalInkDefaults();
  const inlineFinishes = {};
  INLINE_PRINT_SLOTS.forEach((slot) => {
    const source = base.inlineFinishes?.[slot.key] || {};
    inlineFinishes[slot.key] = {
      active: Boolean(source.active),
      processId: source.processId || "",
      materialId: source.materialId || "",
      setupMinutes: n(source.setupMinutes, inlineFinishSetupMinutes(slot.key)),
      costHour: n(source.costHour, 0),
      fixedCost: n(source.fixedCost, 0),
      costPerFoot: n(source.costPerFoot, 0),
      costPerMeter: n(source.costPerMeter, 0),
      costPerMsi: n(source.costPerMsi, 0),
      coveragePct: slot.key === "barniz"
        ? (n(source.coveragePct, 0) > 0 ? n(source.coveragePct, 0) : inkDefaults.barnizCoveragePct)
        : n(source.coveragePct, 100),
      layerGsm: slot.key === "barniz"
        ? (n(source.layerGsm, 0) > 0 ? n(source.layerGsm, 0) : inkDefaults.barnizGsm)
        : n(source.layerGsm, 0),
      costPerLb: n(source.costPerLb, 0),
      plateCost: n(source.plateCost, 0),
      comment: source.comment || ""
    };
  });
  return {
    id: createPrintStageId(),
    machineId: base.machineId || "",
    machineName: base.machineName || "",
    setupMinutes: n(base.setupMinutes, 0),
    cleaningMinutes: n(base.cleaningMinutes, 0),
    mountingMinutes: n(base.mountingMinutes, 0),
    speedMetersMin: n(base.speedMetersMin, 0),
    availableColors: n(base.availableColors, 0),
    costHour: n(base.costHour, 0),
    operatorHourCost: n(base.operatorHourCost, 0),
    coveragePct: n(base.coveragePct, 0) > 0 ? n(base.coveragePct, 0) : inkDefaults.cmykCoveragePct,
    aniloxBcm: n(first(base.aniloxBcm, base.inkGsm), 3),
    transferFactor: n(base.transferFactor, 0.3),
    inkDensity: n(base.inkDensity, 1.5),
    inkCostPerLb: n(base.inkCostPerLb, 0),
    inkGsm: n(base.inkGsm, 0) > 0 ? n(base.inkGsm, 0) : inkDefaults.cmykGsm,
    bcmGenerico: n(base.bcmGenerico, 2),
    whiteInkCostPerLb: n(base.whiteInkCostPerLb, 30),
    pantoneInkCostPerLb: n(base.pantoneInkCostPerLb, 35),
    designCoveragePct: n(base.designCoveragePct, 60),
    inkProfiles: Array.isArray(base.inkProfiles) ? base.inkProfiles.map((item, index) => ({
      id: first(item?.id, `deposito-${index + 1}`),
      tipo: first(item?.tipo, ""),
      bcm: n(item?.bcm, 0),
      coveragePct: n(item?.coveragePct, 0),
      gsm: n(item?.gsm, 0)
    })) : [],
    inlineFinishes
  };
}

function createFinishItem(base = {}, index = 0) {
  const processKey = base.processKey || base.slotKey || `acabado-${index + 1}`;
  return {
    processKey,
    slotKey: processKey,
    slotLabel: base.slotLabel || EXTERNAL_FINISH_BY_KEY[processKey]?.label || `Acabado ${index + 1}`,
    active: base.active !== false,
    processId: base.processId || "",
    machineId: base.machineId || "",
    machineName: base.machineName || "",
    materialId: base.materialId || "",
    description: base.description || base.slotLabel || `Acabado ${index + 1}`,
    setupMinutes: n(base.setupMinutes, 0),
    speed: n(base.speed, 0),
    costHour: n(base.costHour, 0),
    costHourMachine: n(first(base.costHourMachine, base.costHour), 0),
    costHourOperator: n(base.costHourOperator, 0),
    fixedCost: n(base.fixedCost, 0),
    costPerFoot: n(base.costPerFoot, 0),
    costPerMeter: n(base.costPerMeter, 0),
    costPerMsi: n(base.costPerMsi, 0),
    costPerFt2: n(base.costPerFt2, 0),
    costPerUnit: n(base.costPerUnit, 0),
    costPerKg: n(base.costPerKg, 0),
    layerGft2: n(base.layerGft2, 0),
    plateCost: n(base.plateCost, 0),
    plateWidthIn: n(base.plateWidthIn, 0),
    plateLengthIn: n(base.plateLengthIn, 0),
    setupWasteFeet: n(base.setupWasteFeet, 0),
    operationWastePct: n(base.operationWastePct, 0),
    variableBase: n(base.variableBase, 0),
    variableUnitCost: n(base.variableUnitCost, 0),
    comment: base.comment || ""
  };
}

function syncPrimaryPrintStage() {
  const primary = activePrintStages()[0];
  if (!primary) return;
  state.form.print = { ...state.form.print, ...primary };
}

function addProcessKey(key) {
  if (!PROCESS_MENU_BY_KEY[key]) return false;
  if (PROCESS_MENU_BY_KEY[key]?.locked) return false;
  if (key === "impresion") {
    const alreadyActive = hasActiveProcess(key);
    state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).concat(key));
    const stages = activePrintStages();
    const defaultPrintMachine = selectSingleMachineOrNull(printMachines());
    if (alreadyActive) {
      const seed = stages[stages.length - 1] || state.form.print || {};
      state.form.printStages = stages.concat(createPrintStage({
        ...seed,
        machineId: defaultPrintMachine?.id || "",
        machineName: defaultPrintMachine ? machineDisplayName(defaultPrintMachine) : ""
      }));
    } else if (!stages.length) {
      state.form.printStages = [createPrintStage(state.form.print || {})];
    }
    syncPrimaryPrintStage();
    return true;
  }
  if (EXTERNAL_FINISH_BY_KEY[key]) {
      state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).concat(key));
      const finishes = Array.isArray(state.form.finishes) ? state.form.finishes : [];
      const process = findProcessByKeywords(EXTERNAL_FINISH_BY_KEY[key].keywords);
      const machine = selectSingleMachineOrNull(finishMachines(EXTERNAL_FINISH_BY_KEY[key]));
      const machineCapacity = machine ? finishMachineCapacity(machine, EXTERNAL_FINISH_BY_KEY[key]) : null;
      const material = materialsByClassification(EXTERNAL_FINISH_BY_KEY[key].materialFamily, EXTERNAL_FINISH_BY_KEY[key].materialKeywords || [])[0] || null;
      const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
      const wasteDefaults = finishWasteDefault(key);
      state.form.finishes = finishes.concat(createFinishItem({
        processKey: key,
        slotLabel: EXTERNAL_FINISH_BY_KEY[key].label,
        processId: process?.id || "",
        machineId: machine?.id || "",
        machineName: machine ? machineDisplayName(machine) : "",
        materialId: EXTERNAL_FINISH_BY_KEY[key].usesMaterial ? (material?.id || "") : "",
        description: process?.nombre || EXTERNAL_FINISH_BY_KEY[key].label,
        setupMinutes: firstPositiveNumber(process?.tiempo_preparacion_general, machine?.setupBaseMinutes, machineCapacity?.tiempo_preparacion_general, 0),
        speed: firstPositiveNumber(process?.velocidad_produccion, machine?.productionSpeed, machineCapacity?.velocidad_produccion, 0),
        costHour: firstPositiveNumber(process?.costo_hora_maquina, process?.costo_hora_operario, machine?.hourlyMachineCost, machine?.hourlyOperatorCost, machineCapacity?.costo_hora_maquina, machineCapacity?.costo_hora_operario, 0),
        costHourMachine: firstPositiveNumber(process?.costo_hora_maquina, machine?.hourlyMachineCost, machineCapacity?.costo_hora_maquina, 0),
        costHourOperator: firstPositiveNumber(process?.costo_hora_operario, machine?.hourlyOperatorCost, machineCapacity?.costo_hora_operario, 0),
        fixedCost: n(process?.costo_fijo, 0),
        variableUnitCost: n(process?.costo_x_pie || process?.costo_x_msi || process?.costo_x_kg || process?.costo_x_millar, 0),
        costPerFoot: costs.costPerFoot,
        costPerMeter: costs.costPerMeter,
        costPerMsi: costs.costMsi,
        costPerFt2: n(first(material?.costo_x_ft2, material?.costoPorFt2), 0),
        costPerUnit: n(material?.costo_x_unidad, 0),
        costPerKg: n(material?.costo_x_kg, 0),
        layerGft2: n(first(material?.rendimiento_g_ft2, material?.peso_capa_gsm), 0),
        setupWasteFeet: wasteDefaults.setupWasteFeet,
        operationWastePct: wasteDefaults.operationWastePct
      }, finishes.length));
    return true;
  }
  if (!PROCESS_MENU_BY_KEY[key].repeatable && hasActiveProcess(key)) return false;
  state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).concat(key));
  return true;
}

function removeProcessKey(key) {
  if (!PROCESS_MENU_BY_KEY[key]) return;
  if (PROCESS_MENU_BY_KEY[key]?.locked) return;
  if (EXTERNAL_FINISH_BY_KEY[key]) {
    state.form.finishes = (state.form.finishes || []).filter((item) => item.processKey !== key);
  }
  state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).filter((item) => item !== key));
}

function updateProcessSurface() {
  const active = new Set(state.form.activeProcessKeys || []);
  els.processSections.querySelectorAll(".process-card").forEach((cardNode) => {
    const key = cardNode.dataset.processKey;
    const visible = PROCESS_MENU_BY_KEY[key]?.locked
      || active.has(key)
      || (key && key.startsWith("impresion-") && active.has("impresion"))
      || (key && EXTERNAL_FINISH_BY_KEY[key.split("-").slice(0, -1).join("-")] && active.has(key.split("-").slice(0, -1).join("-")));
    cardNode.classList.toggle("is-hidden-process", !visible);
  });
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No fue posible cargar la informacion.");
  return payload;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No fue posible guardar la informacion.");
  return payload;
}

function fillSelect(select, options, selected = "") {
  select.innerHTML = options.map((item) => `<option value="${esc(item.value)}"${String(item.value) === String(selected) ? " selected" : ""}>${esc(item.label)}</option>`).join("");
}

function coreDiameterSelectOptions() {
  const defaults = quoteDefaultsFromConfig();
  const options = [...defaults.coreDiameterOptions];
  const selected = String(first(state.form?.header?.coreDiameter, defaults.coreDiameter)).trim();
  if (selected && !options.includes(selected)) {
    options.push(selected);
  }
  return options.map((item) => ({ value: item, label: item }));
}

function processOptions(items, selected = "") {
  return [`<option value="">Seleccionar...</option>`]
    .concat(items.map((item) => `<option value="${item.id}"${String(item.id) === String(selected) ? " selected" : ""}>${esc(item.nombre || item.descripcion || item.id)}</option>`))
    .join("");
}

function findProcess(id) {
  return (state.catalogs.processes || []).find((item) => String(item.id) === String(id)) || null;
}

function findMachine(id) {
  return (state.catalogs.machines || []).find((item) => String(item.id) === String(id)) || null;
}

function machineCapacities(machine) {
  return Array.isArray(machine?.capacities)
    ? machine.capacities
    : Array.isArray(machine?.capacidades)
      ? machine.capacidades
      : [];
}

function primaryMachineCapacity(machine, predicate = null) {
  const capacities = machineCapacities(machine);
  if (!capacities.length) return null;
  if (typeof predicate === "function") {
    return capacities.find((item) => predicate(item) && item?.activa !== false && item?.active !== false)
      || capacities.find((item) => predicate(item))
      || null;
  }
  return capacities.find((item) => item?.activa !== false && item?.active !== false) || capacities[0] || null;
}

function machineDisplayName(machine) {
  return machine?.machineName || machine?.nombre || machine?.name || machine?.id || "";
}

function machineType(machine) {
  return norm(machine?.tipo || machine?.type || "");
}

function machineProductionTypeLabel(machine) {
  const token = machineType(machine);
  if (token.includes("digital")) return "Digital";
  if (token.includes("conv")) return "Convencional";
  if (token.includes("hibr")) return "Híbrido";
  return machine?.tipo || machine?.type || "";
}

function isDigitalProductionMachine(machine) {
  return machineType(machine).includes("digital");
}

function printSpeedUnit(machine) {
  const token = norm(first(machine?.speedUnit, machine?.unidad_velocidad_produccion, ""));
  if (token === "m/min" || token === "mpm" || token === "metros/min" || token === "metro/min") return "m/min";
  if (token === "ft/min" || token === "pie/min" || token === "pies/min") return "ft/min";
  return isDigitalProductionMachine(machine) ? "m/min" : "ft/min";
}

function printSpeedValue(value) {
  return n(value, 0);
}

function printSpeedMinutes(totalLengthFeet, totalLengthMeters, speedValue, machine) {
  if (speedValue <= 0) return 0;
  return printSpeedUnit(machine) === "m/min"
    ? r(totalLengthMeters / speedValue, 4)
    : r(totalLengthFeet / speedValue, 4);
}

function currentPrintMachine() {
  const stageMachine = activePrintStages()
    .map((item) => findMachine(item?.machineId))
    .find(Boolean);
  return stageMachine || findMachine(state.form?.print?.machineId) || null;
}

function currentPrintProductionType() {
  return machineProductionTypeLabel(currentPrintMachine());
}

function digitalPlateRuleApplies() {
  return isDigitalProductionMachine(currentPrintMachine());
}

function digitalPlateRuleMessage() {
  if (!digitalPlateRuleApplies()) return "";
  return "Costo de planchas y preprensa desactivado por el proceso productivo digital de la máquina de impresión.";
}

function digitalProcessInlineNote() {
  if (!digitalPlateRuleApplies()) return "";
  return "(Desactivado por Proceso de Impresión Digital)";
}

function isMachineActive(machine) {
  return machine?.activa !== false && machine?.active !== false;
}

function capacityHaystack(machine, capacity) {
  return norm(`${machineDisplayName(machine)} ${capacity?.clasificacion || capacity?.category || ""} ${capacity?.proceso || capacity?.process || ""} ${capacity?.subproceso || capacity?.subprocess || ""} ${machine?.observaciones || ""}`);
}

function machineSupportsInline(machine) {
  const type = machineType(machine);
  if (type.includes("digital")) return false;
  if (type.includes("hibr")) return true;
  if (type.includes("conv")) return true;
  const capacity = primaryMachineCapacity(machine);
  return norm(capacity?.subproceso || "").includes("convencional") || norm(capacity?.subproceso || "").includes("hibrida");
}

function printMachineOptions(currentMachineId = "") {
  const machines = (state.catalogs.machines || []).filter((item) => isMachineActive(item));
  const filtered = machines.filter((machine) => {
    const machineHaystack = norm(`${machine?.proceso || ""} ${machine?.subproceso || ""} ${machine?.tipo || ""} ${machine?.type || ""}`);
    if (machineHaystack.includes("impresion")) return true;
    return machineCapacities(machine).some((capacity) => {
      const haystack = capacityHaystack(machine, capacity);
      return haystack.includes("impresion");
    });
  });
  return (filtered.length ? filtered : machines)
    .sort((left, right) => machineDisplayName(left).localeCompare(machineDisplayName(right), "es", { sensitivity: "base" }))
    .map((machine) => ({ id: machine.id, nombre: machineDisplayName(machine) }));
}

function printMachines() {
  return printMachineOptions().map((option) => findMachine(option.id)).filter(Boolean);
}

function plateMachines(entry) {
  return (state.catalogs.machines || []).filter((machine) => {
    if (!isMachineActive(machine)) return false;
    return machineCapacities(machine).some((capacity) => {
      const haystack = capacityHaystack(machine, capacity);
      return haystack.includes("planchas") && entry.keywords.some((keyword) => haystack.includes(norm(keyword)));
    });
  });
}

function plateMachineCapacity(machine, entry) {
  return primaryMachineCapacity(machine, (capacity) => {
    const haystack = capacityHaystack(machine, capacity);
    return haystack.includes("planchas") && entry.keywords.some((keyword) => haystack.includes(norm(keyword)));
  });
}

function finishMachines(config = {}) {
  return (state.catalogs.machines || []).filter((machine) => {
    if (!isMachineActive(machine)) return false;
    const machineHaystack = norm(`${machineDisplayName(machine)} ${machine?.proceso || machine?.process || ""} ${machine?.subproceso || machine?.subprocess || ""} ${machine?.tipo || machine?.type || ""}`);
    if ((config.keywords || []).some((keyword) => machineHaystack.includes(norm(keyword)))) return true;
    return machineCapacities(machine).some((capacity) => {
      const haystack = capacityHaystack(machine, capacity);
      return (config.keywords || []).some((keyword) => haystack.includes(norm(keyword)));
    });
  });
}

function finishMachineCapacity(machine, config = {}) {
  return primaryMachineCapacity(machine, (capacity) => {
    const haystack = capacityHaystack(machine, capacity);
    return (config.keywords || []).some((keyword) => haystack.includes(norm(keyword)));
  });
}

function finishMachineOptions(config = {}, currentMachineId = "") {
  const machines = finishMachines(config);
  const selected = currentMachineId ? findMachine(currentMachineId) : null;
  const source = selected && !machines.some((item) => String(item.id) === String(currentMachineId))
    ? machines.concat(selected)
    : machines;
  return source
    .filter(Boolean)
    .sort((left, right) => machineDisplayName(left).localeCompare(machineDisplayName(right), "es", { sensitivity: "base" }))
    .map((machine) => ({ id: machine.id, nombre: machineDisplayName(machine) }));
}

function selectSingleMachineOrNull(machines = []) {
  return machines.length === 1 ? machines[0] : null;
}

function findProcessByKeywords(keywords = []) {
  return (state.catalogs.processes || []).find((item) => {
    const haystack = norm(`${item.nombre} ${item.descripcion} ${item.categoria}`);
    return keywords.some((keyword) => haystack.includes(norm(keyword)));
  }) || null;
}

function findProcessesByKeywords(keywords = [], category = "") {
  return (state.catalogs.processes || []).filter((item) => {
    const haystack = norm(`${item.nombre} ${item.descripcion} ${item.categoria} ${item.subcategoria} ${item.machine_name}`);
    const categoryOk = !category || norm(item.categoria) === norm(category);
    return categoryOk && keywords.some((keyword) => haystack.includes(norm(keyword)));
  });
}

function byCategory(name) {
  return (state.catalogs.processes || []).filter((item) => norm(item.categoria) === norm(name));
}

function findMaterial(id) {
  return (state.catalogs.materials || []).find((item) => String(item.id) === String(id)) || null;
}

function materialCostPerPound(material) {
  const direct = n(first(material?.costoPorLibra, material?.costo_x_libra), 0);
  if (direct > 0) return direct;
  const perKg = n(material?.costo_x_kg, 0);
  return perKg > 0 ? r(perKg * 0.45359237, 6) : 0;
}

function materialLayerGsm(material, fallback = 0) {
  return n(first(material?.peso_capa_gsm, material?.gsm, material?.gramaje_g_m2), fallback);
}

function materialSheetWidthIn(material) {
  return mmToInches(first(material?.widthMm, material?.ancho_mm));
}

function materialSheetLengthIn(material) {
  return mmToInches(first(material?.lengthMm, material?.largo_mm));
}

function materialSheetAreaIn2(material) {
  const widthIn = materialSheetWidthIn(material);
  const lengthIn = materialSheetLengthIn(material);
  return widthIn > 0 && lengthIn > 0 ? r(widthIn * lengthIn, 4) : 0;
}

function materialSheetCost(material) {
  return n(first(material?.costoPorLamina, material?.costo_x_lamina), 0);
}

function materialSupplyWidthIn(material, fallback = 0) {
  return mmToInches(first(material?.ancho_mm, material?.widthMm)) || n(fallback, 0);
}

function materialWastePct(material) {
  return n(first(material?.merma_pct, material?.mermaPct), 0);
}

function plateStockMaterials(machineId = "") {
  const machine = findMachine(machineId);
  const machineName = norm(machineDisplayName(machine));
  const base = materialsByKeywords(["plancha", "cliche", "cliché", "fotopol", "cyrel"]);
  if (!machineName) return base;
  const narrowed = base.filter((item) => {
    const haystack = norm(`${item.descripcion || ""} ${item.nombre || ""} ${item.tipo_proforma || ""}`);
    return !haystack || haystack.includes("cyrel") || haystack.includes(machineName) || machineName.includes("cyrel");
  });
  return narrowed.length ? narrowed : base;
}

function materialsByKeywords(keywords = []) {
  const materials = state.catalogs.materials || [];
  if (!keywords.length) return materials;
  const filtered = materials.filter((item) => {
    const haystack = norm(`${item.descripcion || ""} ${item.nombre || ""} ${item.nombreTecnico || ""} ${item.familia || ""} ${item.tipo_proforma || ""}`);
    return keywords.some((keyword) => haystack.includes(norm(keyword)));
  });
  return filtered.length ? filtered : materials;
}

function materialsByClassification(family = "", keywords = []) {
  const materials = state.catalogs.materials || [];
  const normalizedFamily = norm(family);
  const familyMatches = normalizedFamily
    ? materials.filter((item) => {
        const itemFamily = norm(item.familia_proceso || item.familiaProceso || item.familia || item.tipo_proforma || "");
        return itemFamily === normalizedFamily;
      })
    : [];
  if (familyMatches.length) return familyMatches;
  return materialsByKeywords(keywords);
}

function materialUnitCosts(material, widthInches = 0) {
  const costFt2 = n(first(material?.costo_x_ft2, material?.costoPorFt2), 0);
  if (costFt2 > 0) {
    const widthFt = n(widthInches, 0) / 12;
    return {
      costMsi: 0,
      costPerFoot: widthFt > 0 ? r(costFt2 * widthFt, 6) : 0,
      costPerMeter: widthFt > 0 ? r((costFt2 * widthFt) / 0.3048, 6) : 0
    };
  }
  const costMsi = n(material?.costoMaterialPorMsi || material?.precioUnitarioCotizacionDol, 0);
  const width = n(widthInches, 0);
  const costPerInch = width > 0 ? r((costMsi * width) / 1000, 6) : 0;
  return {
    costMsi: r(costMsi, 6),
    costPerFoot: r(costPerInch * 12, 6),
    costPerMeter: r(costPerInch / 0.0254, 6)
  };
}

function findDie(code) {
  return (state.catalogs.troqueles || []).find((item) => [item.id, item.codigo, item.codigoTroquel].some((value) => String(value || "") === String(code || ""))) || null;
}

function effectiveColors(form = state.form) {
  if (form.header.noPrint) return 0;
  let total = n(form.header.pantoneCount, 0);
  if (form.header.useCmyk) total += 4;
  if (form.header.useWhiteInk) total += 1;
  if (form.header.doubleWhitePass) total += 1;
  return total;
}

function normalizeQuantities(values = []) {
  const rows = Array.isArray(values) ? values : [];
  const normalized = rows.map((item, index) => ({ id: item?.id || `qty-${index + 1}`, value: Math.max(0, n(item?.value, 0)) }));
  if (!normalized.length) return [{ id: "qty-1", value: 0 }];
  return normalized;
}

function currentQuantity(form = state.form) {
  const selected = normalizeQuantities(form.header.quantities).find((item) => n(item.value, 0) > 0);
  return Math.max(0, n(selected?.value, 0));
}

function quoteDefaultsFromConfig() {
  const general = state.costsConfig?.general || state.config?.general || {};
  return {
    rollWidth: n(first(general.defaultRollWidth, 13), 13),
    coreDiameter: n(first(general.defaultCoreDiameter, 3), 3),
    coreDiameterOptions: Array.isArray(general.coreDiameterOptions) && general.coreDiameterOptions.length
      ? general.coreDiameterOptions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
      : ["1", "1.5", "3", "6"],
    quantityTypes: Math.max(1, n(first(general.defaultQuantityTypes, 1), 1)),
    useCmyk: String(first(general.defaultCmykEnabled, "true")).trim().toLowerCase() !== "false"
  };
}

function laserPlateMetrics(form = state.form) {
  const laser = form?.plates?.laser || {};
  const troquel = form?.troquel || {};
  const totalColors = Math.max(0, effectiveColors(form));
  const mountWidthIn = numericValue(first(troquel.mountWidthIn, troquel.widthIn), 0);
  const mountLengthIn = numericValue(first(troquel.mountLengthIn, troquel.lengthIn), 0);
  const marginIn = numericValue(first(laser.safetyMarginIn, 0.5), 0.5);
  const elongationPct = numericValue(troquel.elongationPct, 0);
  const elongation = elongationFactor(elongationPct);
  const realWidthIn = mountWidthIn > 0 ? r(mountWidthIn + marginIn, 4) : 0;
  const realLengthIn = mountLengthIn > 0 && elongation > 0 ? r((mountLengthIn * elongation) + marginIn, 4) : 0;
  const areaPerColor = realWidthIn > 0 && realLengthIn > 0 ? r(realWidthIn * realLengthIn, 4) : 0;
  const totalArea = totalColors > 0 ? r(areaPerColor * totalColors, 4) : 0;
  const stock = findMaterial(laser.materialId);
  const sheetWidthIn = materialSheetWidthIn(stock);
  const sheetLengthIn = materialSheetLengthIn(stock);
  const sheetAreaIn2 = materialSheetAreaIn2(stock);
  const sheetCost = materialSheetCost(stock);
  const costPerIn2 = sheetAreaIn2 > 0 && sheetCost > 0 ? r(sheetCost / sheetAreaIn2, 6) : 0;
  const sheetFraction = sheetAreaIn2 > 0 && totalArea > 0 ? r(totalArea / sheetAreaIn2, 4) : 0;
  const sheetsPerHour = n(laser.speed, 0);
  const processedAreaPerHour = sheetAreaIn2 > 0 && sheetsPerHour > 0 ? r(sheetAreaIn2 * sheetsPerHour, 4) : 0;
  const totalHours = processedAreaPerHour > 0 && totalArea > 0 ? r(totalArea / processedAreaPerHour, 4) : 0;
  const totalMinutes = totalHours > 0 ? r(totalHours * 60, 2) : 0;
  const hourUsagePct = processedAreaPerHour > 0 && totalArea > 0 ? r((totalArea / processedAreaPerHour) * 100, 2) : 0;
  const materialSubtotal = costPerIn2 > 0 && totalArea > 0 ? r(totalArea * costPerIn2) : 0;
  const hasAbsurdData = mountWidthIn > 200
    || mountLengthIn > 200
    || realWidthIn > 200
    || realLengthIn > 200
    || areaPerColor > 50000
    || totalArea > 200000
    || sheetFraction > 100
    || hourUsagePct > 10000;
  const missing = {
    machine: !String(laser.processId || "").trim(),
    material: !String(laser.materialId || "").trim(),
    costHourMachine: n(laser.costHourMachine, 0) <= 0,
    costHourOperator: n(laser.costHourOperator, 0) <= 0,
    speed: sheetsPerHour <= 0,
    mountWidthIn: mountWidthIn <= 0,
    mountLengthIn: mountLengthIn <= 0,
    elongationPct: elongationPct <= 0,
    totalColors: totalColors <= 0,
    sheetAreaIn2: sheetAreaIn2 <= 0,
    sheetCost: sheetCost <= 0
  };

  return {
    mountWidthIn,
    mountLengthIn,
    marginIn,
    elongationPct,
    elongation,
    totalColors,
    realWidthIn,
    realLengthIn,
    areaPerColor,
    totalArea,
    sheetWidthIn,
    sheetLengthIn,
    sheetAreaIn2,
    sheetCost,
    costPerIn2,
    sheetFraction,
    sheetsPerHour,
    processedAreaPerHour,
    totalHours,
    totalMinutes,
    hourUsagePct,
    materialSubtotal,
    hasAbsurdData,
    missing
  };
}

function captureFocus() {
  const active = document.activeElement;
  if (!active || !(active instanceof HTMLElement)) return null;
  if (active.id) return { selector: `#${active.id}`, start: active.selectionStart, end: active.selectionEnd };
  if (active.dataset?.scope && active.dataset?.field) return { selector: `[data-scope="${active.dataset.scope}"][data-field="${active.dataset.field}"]`, start: active.selectionStart, end: active.selectionEnd };
  if (active.dataset?.quantityIndex) return { selector: `[data-quantity-index="${active.dataset.quantityIndex}"]`, start: active.selectionStart, end: active.selectionEnd };
  return null;
}

function restoreFocus(snapshot) {
  if (!snapshot?.selector) return;
  requestAnimationFrame(() => {
    const target = document.querySelector(snapshot.selector);
    if (!target || !(target instanceof HTMLElement)) return;
    target.focus({ preventScroll: true });
    if (typeof snapshot.start === "number" && typeof target.setSelectionRange === "function") {
      target.setSelectionRange(snapshot.start, snapshot.end ?? snapshot.start);
    }
  });
}

function syncCustomerCodeWidth() {
  if (!els.customerCode) return;
  const size = Math.max(8, Math.min(18, String(els.customerCode.value || "").length + 1));
  els.customerCode.size = size;
}

function renderQuantities() {
  const quantities = normalizeQuantities(state.form.header.quantities);
  state.form.header.quantities = quantities;
  state.form.header.quantity = currentQuantity(state.form);
  const capacity = getQuantityCapacity();
  const addIcon = getQuantityAddIconConfig();
  const deleteIcon = getLineDeleteIconConfig();
  els.quantityRepeater.innerHTML = `<div class="quantity-row">${quantities.map((item, index) => {
    const isLast = index === quantities.length - 1;
    return `<div class="quantity-card${isLast ? " is-last" : ""}">
      <div class="quantity-input-group">
        <input type="text" inputmode="numeric" data-quantity-index="${index}" aria-label="Cantidad ${index + 1}" value="${item.value ? esc(formatInteger(item.value)) : ""}">
        ${isLast ? `<button type="button" class="quantity-inline-action quantity-inline-add" data-action="add-quantity" aria-label="Agregar cantidad" title="Agregar cantidad" style="--quantity-add-icon-color:${esc(addIcon.primary)};--quantity-add-icon-hover:${esc(addIcon.hover)};--quantity-add-icon-size:${addIcon.size}px;"${quantities.length >= capacity ? " disabled" : ""}>${renderIconMarkup(addIcon.value, "Agregar cantidad", "quantity-add-icon")}</button>` : ""}
      </div>
      ${isLast ? `<button type="button" class="quantity-trash-button" data-action="remove-quantity" aria-label="Eliminar última cantidad" title="Eliminar última cantidad" style="--delete-icon-color:${esc(deleteIcon.primary)};--delete-icon-hover:${esc(deleteIcon.hover)};--delete-icon-size:${deleteIcon.size}px;"${quantities.length <= 1 ? " disabled" : ""}>${renderIconMarkup(deleteIcon.value, "Eliminar última cantidad", "quantity-trash-icon")}</button>` : ""}
    </div>`;
  }).join("")}</div>`;
}

function outputPreview() {
  const types = outputTypesCatalog();
  const current = types.find((item) => String(item.id || item.codigo || "").toUpperCase() === String(state.form.header.outputType || "").toUpperCase()) || types[types.length - 1];
  const displayId = current.shortName || current.code || current.codigo || current.id;
  const imageUrl = first(current.imageUrl, current.image_url, "");
  els.outputTypePreview.innerHTML = imageUrl
    ? `<div class="output-image-frame"><img src="${esc(imageUrl)}" alt="${esc(current.name || current.nombre || displayId || "Tipo de salida")}" class="output-image"></div>`
    : `<div class="output-tile"><div class="output-placeholder">${esc(displayId)}</div></div>`;
}

function metric(label, value) {
  return `<div class="metric-cell"><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function metricWithInfo(label, value, infoTitle, infoBody) {
  return `<div class="metric-cell"><span class="metric-label-with-info">${esc(label)}${infoPopoverButton(infoTitle, infoBody)}</span><strong>${value}</strong></div>`;
}

function summaryRowWithInfo(label, value, infoTitle, infoBody) {
  return `<div class="summary-row"><span class="metric-label-with-info">${esc(label)}${infoPopoverButton(infoTitle, infoBody)}</span><strong>${value}</strong></div>`;
}

function metricBox(label, value, missing = false, alert = false) {
  return `<div class="metric-cell${missing ? " metric-cell-required" : ""}${alert ? " metric-cell-alert" : ""}"><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function infoPopoverButton(title, body) {
  if (!title && !body) return "";
  const icon = first(state.config?.icons?.fieldInfo, "i");
  const iconColor = first(state.config?.general?.iconColorFieldInfo, "#4f6f8f");
  const iconSize = Number(state.config?.general?.iconSizeFieldInfo) || 12;
  return `<details class="info-popover"><summary class="info-popover-trigger" style="--info-icon-color:${esc(iconColor)};--info-icon-size:${esc(iconSize)}px;" aria-label="${esc(title || "Información")}">${renderIconMarkup(icon, title || "Información", "info-popover-icon")}</summary><div class="info-popover-panel"><strong>${esc(title || "Información")}</strong><p>${esc(body || "")}</p></div></details>`;
}

function formatDisplayNumber(value, { prefix = "", suffix = "", maximumFractionDigits = 2, integer = false } = {}) {
  const display = integer ? formatInteger(value) : num(value, maximumFractionDigits);
  return `${prefix ? `${prefix} ` : ""}${display}${suffix ? ` ${suffix}` : ""}`.trim();
}

function displayInput(scope, field, value, options = {}) {
  const {
    step = "0.01",
    prefix = "",
    suffix = "",
    maximumFractionDigits = 2,
    integer = false,
    inputValue = value,
    displayValue = value
  } = options;
  const formattedDisplayValue = formatDisplayNumber(displayValue, { prefix, suffix, maximumFractionDigits, integer });
  return `<div class="display-input-wrap"><input class="display-input" data-scope="${esc(scope)}" data-field="${esc(field)}" type="number" step="${esc(step)}" value="${esc(inputValue)}"><span class="display-input-mask">${esc(formattedDisplayValue)}</span></div>`;
}

function setRequiredState(node, missing) {
  if (!node) return;
  node.classList.toggle("field-required-input", Boolean(missing));
  const wrap = node.closest?.(".display-input-wrap");
  if (wrap) wrap.classList.toggle("field-required-wrap", Boolean(missing));
}

function markRequiredNode(node, missing) {
  if (!node) return;
  if (Array.isArray(node) || node instanceof NodeList) {
    [...node].forEach((item) => setRequiredState(item, missing));
    return;
  }
  setRequiredState(node, missing);
}

function markRequiredScoped(scope, field, missing) {
  document.querySelectorAll(`[data-scope="${scope}"][data-field="${field}"]`).forEach((node) => setRequiredState(node, missing));
}

function clearRequiredHighlights() {
  document.querySelectorAll(".field-required-input").forEach((node) => node.classList.remove("field-required-input"));
  document.querySelectorAll(".field-required-wrap").forEach((node) => node.classList.remove("field-required-wrap"));
}

function applyRequiredHighlights(result = null) {
  clearRequiredHighlights();
  const form = state.form || {};
  const totalsResult = result || totals();
  const quantityMissing = currentQuantity(form) <= 0;
  const coreDiameterValue = n(form.header?.coreDiameter, 0);

  markRequiredNode(els.labelWidthIn, n(form.header?.labelWidthIn, 0) <= 0);
  markRequiredNode(els.labelHeightIn, n(form.header?.labelHeightIn, 0) <= 0);
  markRequiredNode(els.rollWidthIn, n(form.header?.rollWidthIn, 0) <= 0);
  markRequiredNode(els.coreDiameter, coreDiameterValue <= 0 || coreDiameterValue > 10);
  markRequiredNode(els.labelsPerRoll, n(form.header?.labelsPerRoll, 0) <= 0);
  markRequiredNode(els.applicationType, !String(form.header?.applicationType || "").trim());
  markRequiredNode(els.quantityTypes, n(form.header?.quantityTypes, 0) <= 0);
  markRequiredNode(els.quantityRepeater?.querySelectorAll("input[data-quantity-index]"), quantityMissing);

  markRequiredScoped("troquel", "dieCode", !String(form.troquel?.dieCode || "").trim());
  markRequiredScoped("substrate", "materialId", !String(form.substrate?.materialId || "").trim());
  markRequiredScoped("substrate", "costPerFoot", n(form.substrate?.costPerFoot, 0) <= 0);

  if (hasActiveProcess("diseno")) {
    markRequiredScoped("design", "artCount", n(form.design?.artCount, 0) <= 0);
    markRequiredScoped("design", "timePerArt", n(form.design?.timePerArt, 0) <= 0);
    markRequiredScoped("design", "hourCost", n(form.design?.hourCost, 0) <= 0);
  }

  if (hasActiveProcess("preprensa")) {
    markRequiredScoped("prepress", "artsPerHour", n(form.prepress?.artsPerHour, 0) <= 0);
    markRequiredScoped("prepress", "artCount", n(form.prepress?.artCount, 0) <= 0);
    markRequiredScoped("prepress", "hourCost", n(form.prepress?.hourCost, 0) <= 0);
  }

  if (hasActiveProcess("planchas")) {
    const laser = laserPlateMetrics(form);
    markRequiredScoped("plates.laser", "processId", laser.missing.machine);
    markRequiredScoped("plates.laser", "materialId", laser.missing.material);
    markRequiredScoped("plates.laser", "costHourMachine", laser.missing.costHourMachine);
    markRequiredScoped("plates.laser", "costHourOperator", laser.missing.costHourOperator);
    markRequiredScoped("plates.laser", "speed", laser.missing.speed);
    PLATE_KEYS.filter((entry) => entry.key !== "laser").forEach((entry) => {
      const step = form.plates?.[entry.key] || {};
      markRequiredScoped(`plates.${entry.key}`, "processId", !String(step.processId || "").trim());
      markRequiredScoped(`plates.${entry.key}`, "fixedMinutes", n(step.fixedMinutes, 0) <= 0);
      markRequiredScoped(`plates.${entry.key}`, "costHourMachine", n(step.costHourMachine, 0) <= 0);
      markRequiredScoped(`plates.${entry.key}`, "costHourOperator", n(step.costHourOperator, 0) <= 0);
    });
  }

  if (hasActiveProcess("impresion")) {
    activePrintStages().forEach((stage, index) => {
      const scope = `printStages.${index}`;
      markRequiredScoped(scope, "machineId", !String(stage.machineId || "").trim());
      markRequiredScoped(scope, "setupMinutes", n(stage.setupMinutes, 0) <= 0);
      markRequiredScoped(scope, "cleaningMinutes", n(stage.cleaningMinutes, 0) <= 0);
      markRequiredScoped(scope, "mountingMinutes", n(stage.mountingMinutes, 0) <= 0);
      markRequiredScoped(scope, "coveragePct", n(stage.coveragePct, 0) <= 0);
      markRequiredScoped(scope, "designCoveragePct", n(stage.designCoveragePct, 0) <= 0);
      markRequiredScoped(scope, "bcmGenerico", n(stage.bcmGenerico, 0) <= 0);
      markRequiredScoped(scope, "aniloxBcm", n(stage.aniloxBcm, 0) <= 0);
      markRequiredScoped(scope, "inkGsm", n(stage.inkGsm, 0) <= 0);
      markRequiredScoped(scope, "transferFactor", n(stage.transferFactor, 0) <= 0);
      markRequiredScoped(scope, "inkDensity", n(stage.inkDensity, 0) <= 0);
      markRequiredScoped(scope, "speedMetersMin", n(stage.speedMetersMin, 0) <= 0);
      markRequiredScoped(scope, "inkCostPerLb", n(stage.inkCostPerLb, 0) <= 0);
      markRequiredScoped(scope, "whiteInkCostPerLb", n(stage.whiteInkCostPerLb, 0) <= 0);
      markRequiredScoped(scope, "pantoneInkCostPerLb", n(stage.pantoneInkCostPerLb, 0) <= 0);
      markRequiredScoped(scope, "availableColors", n(stage.availableColors, 0) <= 0);
      markRequiredScoped(scope, "costHour", n(stage.costHour, 0) <= 0);
      markRequiredScoped(scope, "operatorHourCost", n(stage.operatorHourCost, 0) <= 0);
    });
  }

  (form.finishes || []).forEach((finish, index) => {
    const config = EXTERNAL_FINISH_BY_KEY[finish.processKey];
    if (!config) return;
    const scope = `finishes.${index}`;
    markRequiredScoped(scope, "machineId", !String(finish.machineId || "").trim());
    markRequiredScoped(scope, "setupMinutes", n(finish.setupMinutes, 0) <= 0);
    markRequiredScoped(scope, "speed", n(finish.speed, 0) <= 0);
    markRequiredScoped(scope, "costHourMachine", n(first(finish.costHourMachine, finish.costHour), 0) <= 0);
    markRequiredScoped(scope, "costHourOperator", n(finish.costHourOperator, 0) <= 0);
    if (config.usesMaterial) {
      markRequiredScoped(scope, "materialId", !String(finish.materialId || "").trim());
      if (config.usesWeightMaterial) {
        markRequiredScoped(scope, "layerGft2", n(finish.layerGft2, 0) <= 0);
        markRequiredScoped(scope, "costPerKg", n(finish.costPerKg, 0) <= 0);
      } else if (config.usesUnitMaterial) {
        markRequiredScoped(scope, "costPerUnit", n(finish.costPerUnit, 0) <= 0);
      } else if (config.usesMaterial) {
        markRequiredScoped(scope, "costPerFt2", n(finish.costPerFt2, 0) <= 0);
      }
    }
    if (config.usesPlateCost) {
      markRequiredScoped(scope, "plateCost", n(finish.plateCost, 0) <= 0);
    }
  });

  if (hasActiveProcess("empaque")) {
    markRequiredScoped("packaging", "rollCount", n(form.packaging?.rollCount, 0) <= 0);
    markRequiredScoped("packaging", "yieldPerHour", n(form.packaging?.yieldPerHour, 0) <= 0);
    markRequiredScoped("packaging", "operators", n(form.packaging?.operators, 0) <= 0);
    markRequiredScoped("packaging", "hourCost", n(form.packaging?.hourCost, 0) <= 0);
  }
}

function affixInput(inputMarkup, { prefix = "", suffix = "" } = {}) {
  const prefixMarkup = prefix ? `<span class="field-affix-tag field-affix-prefix">${esc(prefix)}</span>` : "";
  const suffixMarkup = suffix ? `<span class="field-affix-tag field-affix-suffix">${esc(suffix)}</span>` : "";
  return `<div class="field-affix">${prefixMarkup}${inputMarkup}${suffixMarkup}</div>`;
}

function formula(title, body, explanation) {
  return `<div class="formula-block"><h4>${esc(title)}</h4><p><strong>Formula:</strong> ${esc(body)}</p><p><strong>Explicacion:</strong> ${esc(explanation)}</p></div>`;
}

function issueList(title, issues = []) {
  if (!Array.isArray(issues) || !issues.length) return "";
  return `<div class="formula-issues"><strong>${esc(title)}</strong><ul>${issues.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`;
}

function card(processKey, title, subtitle, subtotal, body, options = {}) {
  const { open = false, removable = false, removeType = "", removeIndex = "" } = options;
  return `<details class="process-card" data-process-key="${esc(processKey)}"${open ? " open" : ""}><summary><div class="process-summary-main"><strong>${title}</strong><span>${esc(subtitle)}</span></div><div class="process-summary-side"><em>${money(subtotal)}</em></div></summary><div class="process-body">${body}</div>${removable ? `<button type="button" class="process-remove-button" data-action="remove-process" data-remove-type="${esc(removeType)}" data-remove-index="${esc(removeIndex)}" aria-label="Eliminar proceso"><span class="trash-icon" aria-hidden="true"></span></button>` : ""}</details>`;
}

function snapshotOpenProcesses() {
  const current = {};
  document.querySelectorAll("details.process-card, details.subprocess-card[data-open-key]").forEach((node) => {
    const key = node.dataset.openKey || node.dataset.processKey || node.querySelector("summary strong")?.textContent?.trim();
    if (key) current[key] = node.open;
  });
  state.processOpen = { ...state.processOpen, ...current };
}

function restoreOpenProcesses() {
  document.querySelectorAll("details.process-card, details.subprocess-card[data-open-key]").forEach((node) => {
    const key = node.dataset.openKey || node.dataset.processKey || node.querySelector("summary strong")?.textContent?.trim();
    if (key && Object.prototype.hasOwnProperty.call(state.processOpen, key)) {
      node.open = Boolean(state.processOpen[key]);
    }
  });
}

function metrics(form = state.form) {
  const qty = currentQuantity(form);
  const labelsPerRepeat = Math.max(0, n(form.troquel.rows, 0) * n(form.troquel.repeats, 0));
  const cylinderDevelopmentIn = r(firstPositiveNumber(
    form.troquel?.cylinderDevelopmentIn,
    form.troquel?.developmentIn,
    form.troquel?.desarrolloIn,
    form.troquel?.desarrollo,
    n(form.troquel?.lengthIn, 0) * Math.max(1, n(form.troquel?.repeats, 0))
  ), 4);
  const acrossCount = Math.max(0, n(first(form.troquel?.acrossCount, form.troquel?.rows), 0));
  const development = cylinderDevelopmentIn;
  const linealIn = acrossCount > 0 ? r((qty * cylinderDevelopmentIn) / acrossCount, 6) : 0;
  const linealFeet = r(linealIn / 12);
  const linealMeters = r(linealIn * 0.0254);
  const areaIn2 = r(n(form.header.labelWidthIn, 0) * n(form.header.labelHeightIn, 0), 6);
  const printedAreaM2 = r(areaIn2 * qty * 0.00064516, 6);
  const printedAreaFt2 = r((areaIn2 * qty) / 144, 6);
  const rollCount = n(form.header.labelsPerRoll, 0) > 0 ? r(qty / n(form.header.labelsPerRoll, 0), 4) : 0;
  const webWidthIn = n(form.header.rollWidthIn, 0);
  return {
    qty,
    labelsPerRepeat,
    acrossCount,
    cylinderDevelopmentIn,
    development,
    linealIn,
    linealFeet,
    linealMeters,
    areaIn2,
    printedAreaM2,
    printedAreaFt2,
    rollCount,
    webWidthIn,
    colors: effectiveColors(form)
  };
}

function inlineItemsForMacula(stage = {}) {
  return INLINE_PRINT_SLOTS.map((slot) => {
    const inline = stage.inlineFinishes?.[slot.key] || {};
    return {
      key: slot.key,
      label: slot.label,
      active: Boolean(inline.active)
    };
  });
}

function documentMaculaFromStages(base = metrics()) {
  const items = activePrintStages().map((stage) => resolvePrintMacula(base, inlineItemsForMacula(stage)));
  return {
    items,
    setupFeet: r(items.reduce((sum, item) => sum + n(item.setupFeet, 0), 0), 2),
    tirajeFeet: r(items.reduce((sum, item) => sum + n(item.tirajeFeet, 0), 0), 2),
    totalFeet: r(items.reduce((sum, item) => sum + n(item.totalFeet, 0), 0), 2)
  };
}

function buildFormulaIssues({
  qty = 0,
  cylinderDevelopmentIn = 0,
  acrossCount = 0,
  startupWasteFeet = 0,
  webWidthIn = 0,
  speedFtMin = 0,
  speedMMin = 0,
  setupAdjustmentMin = 0,
  requiresTime = false,
  requiresWaste = false
} = {}) {
  const issues = [];
  if (qty <= 0) issues.push("Falta Cantidad a Producir.");
  if (cylinderDevelopmentIn <= 0) issues.push("Falta Desarrollo del Cilindro en el troquel.");
  if (acrossCount <= 0) issues.push("Falta Cantidad de Etiquetas al Través en el troquel.");
  if (webWidthIn <= 0) issues.push("Falta Ancho de la Bobina.");
  if (requiresWaste && startupWasteFeet <= 0) issues.push("Falta Desperdicio de Arranque o Mácula activa para completar la longitud total.");
  if (requiresTime && speedFtMin <= 0 && speedMMin <= 0) issues.push("Falta Velocidad de Operación.");
  if (requiresTime && setupAdjustmentMin <= 0) issues.push("Falta Tiempo de Montaje y Ajuste.");
  return issues;
}

function substrateUnitCost(form = state.form, base = metrics(form)) {
  return n(form.substrate.costPerFoot, 0);
}

function substrateConsumptionValue(form = state.form, base = metrics(form)) {
  return base.linealFeet;
}

function buildForm() {
  const context = state.context?.calculo || null;
  const quote = state.context?.cotizacion || null;
  const savedUi = context?.uiState || null;
  const raw = context?.raw_data || {};
  const die = findDie(context?.dieCode);
  const printProcess = byCategory("impresion")[0] || findProcessByKeywords(["impresion"]);
  const materialId = context?.materialCode || "";
  const material = findMaterial(materialId);
  const processMsi = n(material?.costoMaterialPorMsi || material?.precioUnitarioCotizacionDol, 0);
  const typeOptions = outputTypesCatalog();
  const defaultOutputType = String(first(typeOptions[0]?.id, typeOptions[0]?.codigo, "INDIFERENTE")).toUpperCase();
  const requestedOutputType = String(first(context?.outputType, defaultOutputType)).toUpperCase();
  const outputType = typeOptions.some((item) => String(item.id || item.codigo || "").toUpperCase() === requestedOutputType) ? requestedOutputType : defaultOutputType;
  const quantityProducts = n(context?.quantityProducts, 0);
  const dieMetrics = resolveDieMetrics(die || {}, context || {});
  const maculaConfig = defaultMaculaConfig();
  const inkDefaults = conventionalInkDefaults();
  const quoteDefaults = quoteDefaultsFromConfig();

  const form = {
    header: {
      customerCode: first(quote?.customer_code, context?.customerCode),
      customerName: first(quote?.customer_name, context?.customerName),
      productType: "Etiquetas",
      jobName: first(context?.jobName, "Nuevo trabajo"),
      salespersonName: first(quote?.salesperson_name, context?.salespersonName),
      workType: first(context?.orderType, "Nuevo"),
      labelWidthIn: n(context?.widthInches, 0),
      labelHeightIn: n(context?.lengthInches, 0),
      rollWidthIn: n(first(savedUi?.header?.rollWidthIn, context?.coreWidth, context?.materialWidth, dieMetrics.materialWidthIn, context?.widthInches, quoteDefaults.rollWidth), 0),
      coreDiameter: String(first(savedUi?.header?.coreDiameter, context?.coreDiameter, quoteDefaults.coreDiameter)).trim(),
      labelsPerRoll: n(context?.labelsPerRoll, 0),
      applicationType: first(context?.applicationType, ""),
      outputType,
      applicationEnvironment: first(raw["AMBIENTE APLICACION"], ""),
      surfaceType: first(raw["TIPO SUPERFICIE"], ""),
      quantityTypes: Math.max(1, n(first(savedUi?.header?.quantityTypes, context?.quantityTypes, raw["CANTIDAD TIPOS"], quoteDefaults.quantityTypes), quoteDefaults.quantityTypes)),
      quantityChanges: n(context?.quantityChanges, 0),
      pantoneCount: n(context?.pantoneCount, 0),
      useCmyk: savedUi?.header?.useCmyk ?? (context?.cmyk === true || norm(raw["CMYK"]) === "si" || quoteDefaults.useCmyk),
      useWhiteInk: norm(raw["TINTA BLANCA | CHECK"]) === "si",
      doubleWhitePass: norm(raw["TINTA BLANCA | DOBLE PASADA | CHECK"]) === "si",
      noPrint: norm(raw["SIN IMPRESION"]) === "si",
      quantity: quantityProducts,
      quantities: normalizeQuantities([{ id: "qty-1", value: quantityProducts }]),
      quoteCode: context?.quoteCode || quote?.quote_code || "",
      lineCode: context?.lineCode || "",
      lineStatus: context?.lineStatus || "",
      processType: context?.processType || ""
    },
    commercial: { overheadPct: 0, marginPct: 35, taxPct: 13 },
    macula: {
      source: maculaConfig.source,
      montajeRows: maculaConfig.montajeRows,
      tirajeRows: maculaConfig.tirajeRows
    },
    troquel: {
      ...dieMetrics
    },
    substrate: {
      materialId,
      unit: "pies",
      costPerFoot: r((((processMsi * n(context?.materialWidth || context?.widthInches, 0)) / 1000) || 0) * 12, 6),
      costPerMeter: r((((processMsi * n(context?.materialWidth || context?.widthInches, 0)) / 1000) || 0) / 0.0254, 6),
      costPerMsi: r(processMsi, 6)
    },
    design: { artCount: Math.max(1, n(context?.quantityTypes, n(raw["CANTIDAD TIPOS"], n(raw["CANTIDAD ARTES"], 1)))), timePerArt: 0.75, changeFactor: 0.5, hourCost: n(findProcessByKeywords(["diseno"])?.costo_hora_operario, 15) },
    prepress: { artCount: Math.max(1, n(context?.quantityTypes, n(raw["CANTIDAD TIPOS"], n(raw["CANTIDAD ARTES"], 1)))), artsPerHour: 2, hourCost: n(findProcessByKeywords(["preprensa"])?.costo_hora_operario, 15) },
    plates: {},
    print: (() => {
      const selectedPrintMachine = selectSingleMachineOrNull(printMachines());
      const selectedPrintCapacity = selectedPrintMachine
        ? (primaryMachineCapacity(selectedPrintMachine, (item) => {
            const haystack = capacityHaystack(selectedPrintMachine, item);
            return haystack.includes("impresion") || haystack.includes("digital");
          }) || primaryMachineCapacity(selectedPrintMachine))
        : null;
      return {
        machineId: selectedPrintMachine?.id || "",
        machineName: selectedPrintMachine ? machineDisplayName(selectedPrintMachine) : "",
        setupMinutes: firstPositiveNumber(selectedPrintMachine?.setupBaseMinutes, selectedPrintCapacity?.tiempo_preparacion_general, printProcess?.tiempo_preparacion_general, 20),
        cleaningMinutes: 12,
        mountingMinutes: firstPositiveNumber(selectedPrintMachine?.setupPerStationMinutes, selectedPrintCapacity?.tiempo_por_estacion, printProcess?.tiempo_por_estacion, 0) * Math.max(1, n(context?.tintCount, 0)),
        speedMetersMin: printSpeedValue(firstPositiveNumber(selectedPrintMachine?.productionSpeed, selectedPrintCapacity?.velocidad_produccion, printProcess?.velocidad_produccion, 0)),
        availableColors: machineSupportsInline(selectedPrintMachine) ? 8 : 4,
        costHour: firstPositiveNumber(selectedPrintMachine?.hourlyMachineCost, selectedPrintCapacity?.costo_hora_maquina, printProcess?.costo_hora_maquina, 18),
        operatorHourCost: firstPositiveNumber(selectedPrintMachine?.hourlyOperatorCost, selectedPrintCapacity?.costo_hora_operario, 0),
        coveragePct: inkDefaults.coberturaTintaPct,
        aniloxBcm: inkDefaults.cmykBcm || inkDefaults.bcmGenerico,
        transferFactor: 0.3,
        inkDensity: inkDefaults.densidadUv,
        inkCostPerLb: inkDefaults.costoLbCmyk,
        inkGsm: inkDefaults.cmykGsm,
        bcmGenerico: inkDefaults.bcmGenerico,
        whiteInkCostPerLb: inkDefaults.costoLbBlanco,
        pantoneInkCostPerLb: inkDefaults.costoLbPantone,
        designCoveragePct: inkDefaults.coberturaDisenoPct,
        inkProfiles: inkDefaults.depositos
      };
    })(),
    printStages: [],
    finishes: [],
    packaging: { rollCount: 0, yieldPerHour: 80, operators: 2, hourCost: n(findProcessByKeywords(["empaque"])?.costo_hora_operario, 8), externalCost: 0, comments: "", attachmentName: "" },
    additional: [],
    activeProcessKeys: [],
    launcherPosition: null
  };

  PLATE_KEYS.forEach((entry) => {
    const machine = selectSingleMachineOrNull(plateMachines(entry));
    const capacity = plateMachineCapacity(machine, entry);
    const stock = entry.key === "laser" ? (plateStockMaterials(machine?.id)[0] || null) : null;
    form.plates[entry.key] = {
      processId: machine?.id || "",
      machineName: machineDisplayName(machine) || entry.machine,
      materialId: stock?.id || "",
      area: 0,
      speed: firstPositiveNumber(capacity?.velocidad_produccion, 0),
      fixedMinutes: entry.key === "laser" ? 0 : firstPositiveNumber(capacity?.tiempo_preparacion_general, 15),
      costHourMachine: firstPositiveNumber(capacity?.costo_hora_maquina, 0),
      costHourOperator: firstPositiveNumber(capacity?.costo_hora_operario, 15),
      safetyMarginIn: entry.key === "laser" ? 0.5 : 0
    };
  });

  const base = metrics(form);
  form.plates.laser.area = laserPlateMetrics(form).totalArea;
  form.finishes = (Array.isArray(form.finishes) ? form.finishes : []).map((item, index) => createFinishItem({
    ...item,
    variableBase: item.processKey === "estampado" ? base.printedAreaM2 : base.linealFeet
  }, index));
  form.packaging.rollCount = base.rollCount;
  form.header.quantity = currentQuantity(form);
  if (savedUi && typeof savedUi === "object") {
    stateSafeMerge(form, savedUi);
    form.header.quantities = normalizeQuantities(form.header.quantities);
    form.header.quantity = currentQuantity(form);
  }
  form.macula = {
    source: first(form.macula?.source, maculaConfig.source),
    montajeRows: normalizeMaculaMontajeRows(form.macula?.montajeRows || maculaConfig.montajeRows),
    tirajeRows: normalizeMaculaTirajeRows(form.macula?.tirajeRows || maculaConfig.tirajeRows)
  };
  form.activeProcessKeys = (form.activeProcessKeys || []).filter((key) => key !== "acabados");
  form.substrate.unit = "pies";
  form.plates.laser.safetyMarginIn = Number.isFinite(Number(form.plates.laser.safetyMarginIn)) ? n(form.plates.laser.safetyMarginIn, 0.5) : 0.5;
  form.plates.laser.area = laserPlateMetrics(form).totalArea;
  const legacyPrint = form.print && typeof form.print === "object" ? JSON.parse(JSON.stringify(form.print)) : null;
  if (!Array.isArray(form.printStages) || !form.printStages.length) {
    form.printStages = [createPrintStage(legacyPrint || {})];
  } else {
    form.printStages = form.printStages.map((item) => createPrintStage(item || {}));
  }
  form.finishes = (Array.isArray(form.finishes) ? form.finishes : [])
    .map((item, index) => createFinishItem({
      ...item,
      processKey: item.processKey || item.slotKey || item.key || "",
      slotLabel: item.slotLabel || EXTERNAL_FINISH_BY_KEY[item.processKey || item.slotKey || item.key || ""]?.label
    }, index))
    .filter((item) => EXTERNAL_FINISH_BY_KEY[item.processKey]);
  const shouldExpand = false;
  state.form = form;
  ensureActiveProcessKeys(shouldExpand);
  syncPrimaryPrintStage();
  return form;
}

function calcTroquel() {
  const base = metrics();
  return {
    subtotal: 0,
    labelsPerRepeat: base.labelsPerRepeat,
    development: base.development,
    formulaText: "Etiquetas por repeticion = filas x repeticiones. Desarrollo del troquel = largo troquel x repeticiones.",
    explanation: "Este bloque toma el troquel seleccionado del inventario para determinar cuantas etiquetas salen por vuelta y cual es el desarrollo real que usaremos en el resto del calculo."
  };
}

function calcMacula() {
  const macula = state.form?.macula || {};
  const montajeRows = normalizeMaculaMontajeRows(macula.montajeRows || []);
  const tirajeRows = normalizeMaculaTirajeRows(macula.tirajeRows || []);
  return {
    subtotal: 0,
    source: first(macula.source, "convencional"),
    montajeRows,
    tirajeRows,
    montajeTotalPies: r(montajeRows.reduce((sum, row) => sum + n(row.totalPies, 0), 0), 2),
    montajeTotalEstaciones: r(montajeRows.reduce((sum, row) => sum + n(row.porEstacion, 0), 0), 2),
    tirajePromedioPct: tirajeRows.length ? r(tirajeRows.reduce((sum, row) => sum + n(row.porcentaje, 0), 0) / tirajeRows.length, 2) : 0,
    formulaText: "Mácula base = parámetros de montaje y tiraje definidos en Costos. La cotización los carga como referencia editable por documento.",
    explanation: "Este bloque resume la configuración vigente de mácula y la deja editable dentro de la cotización para ajustar el desperdicio del trabajo sin cambiar la tabla maestra."
  };
}

function normalizeMaculaProcessKey(value) {
  const token = norm(value);
  if (!token) return "";
  if (token.includes("impres")) return "impresion";
  if (token.includes("troquel")) return "troquelado";
  if (token.includes("laminad")) return "laminado";
  if (token.includes("barniz")) return "barniz";
  if (token.includes("embos")) return "embosado";
  if (token.includes("estamp")) return "estampado";
  if (token.includes("numer")) return "numerado";
  return token;
}

function parseMaculaDetailTokens(detail) {
  return [...new Set(String(detail || "")
    .split("+")
    .map((part) => normalizeMaculaProcessKey(part))
    .filter(Boolean))];
}

function resolvePrintMacula(base, inlineItems = []) {
  const macula = calcMacula();
  const activeInlineKeys = inlineItems
    .filter((item) => item.active)
    .map((item) => normalizeMaculaProcessKey(item.key || item.label || ""))
    .filter(Boolean);
  const activeSet = new Set(["impresion", ...activeInlineKeys]);

  const setupRows = macula.montajeRows.filter((row) => activeSet.has(normalizeMaculaProcessKey(row.detalle)));
  const setupFeet = r(setupRows.reduce((sum, row) => sum + n(row.totalPies, 0), 0), 2);

  let tirajeRow = null;
  macula.tirajeRows.forEach((row) => {
    const tokens = parseMaculaDetailTokens(row.detalle);
    if (!tokens.length) return;
    const matches = tokens.every((token) => activeSet.has(token));
    if (!matches) return;
    if (!tirajeRow || tokens.length > parseMaculaDetailTokens(tirajeRow.detalle).length) {
      tirajeRow = row;
    }
  });

  const tirajePct = n(tirajeRow?.porcentaje, 0);
  const tirajeFeet = r(n(base.linealFeet, 0) * (tirajePct / 100), 2);
  const totalFeet = r(setupFeet + tirajeFeet, 2);

  return {
    setupRows,
    tirajeRow,
    setupFeet,
    tirajePct,
    tirajeFeet,
    totalFeet,
    activeInlineKeys
  };
}

function calcSustrato() {
  const base = metrics();
  const macula = hasActiveProcess("impresion") ? documentMaculaFromStages(base) : { totalFeet: 0 };
  const startupWasteFeet = r(macula.totalFeet, 2);
  const totalLengthFeet = r(base.linealFeet + startupWasteFeet, 2);
  const totalLengthMeters = r(totalLengthFeet * 0.3048, 4);
  const totalAreaFt2 = r(totalLengthFeet * (n(base.webWidthIn, 0) / 12), 6);
  const unitCost = substrateUnitCost(state.form, base);
  const consumption = totalLengthFeet;
  const subtotal = r(consumption * unitCost);
  const unitLabel = "pie lineal";
  const unitCostLabel = "Costo por Pie";
  const issues = buildFormulaIssues({
    qty: base.qty,
    cylinderDevelopmentIn: base.cylinderDevelopmentIn,
    acrossCount: base.acrossCount,
    startupWasteFeet,
    webWidthIn: base.webWidthIn,
    requiresWaste: hasActiveProcess("impresion")
  });
  return {
    ...base,
    startupWasteFeet,
    totalLengthFeet,
    totalLengthMeters,
    totalAreaFt2,
    consumption,
    unitCost,
    unitLabel,
    unitCostLabel,
    subtotal,
    issues,
    formulaConsumption: "Longitud Total (pies) = [ (Cantidad a Producir x Desarrollo del Cilindro) / (12 x Cantidad de Etiquetas al Través) ] + Desperdicio de Arranque",
    formulaArea: "Área Total Consumida (pies²) = Longitud Total (pies) x (Ancho de la Bobina / 12)",
    formulaCost: `Costo sustrato = Longitud Total en ${unitLabel} x ${unitCostLabel}`,
    explanation: "Sustrato ahora toma la longitud neta del trabajo, le suma la mácula o desperdicio de arranque y con eso calcula tanto la longitud total requerida como el área total consumida del material."
  };
}

function calcDesign() {
  const artCount = Math.max(1, n(state.form.header.quantityTypes, n(state.form.design.artCount, 1)));
  const changeCount = n(state.form.header.quantityChanges, 0);
  const time = r((artCount * n(state.form.design.timePerArt, 0)) + (changeCount * n(state.form.design.timePerArt, 0) * n(state.form.design.changeFactor, 0)));
  return { time, subtotal: r(time * n(state.form.design.hourCost, 0)), formulaText: "Tiempo total = (artes x tiempo base) + (cambios x tiempo base x factor de cambios). Costo = tiempo total x costo hora disenador.", explanation: "Diseno toma la cantidad de tipos del encabezado y suma el tiempo adicional por cambios para dejar visible el costo creativo real del trabajo." };
}

function calcPrepress() {
  if (digitalPlateRuleApplies()) {
    return {
      time: 0,
      subtotal: 0,
      formulaText: "Costo = 0.",
      explanation: digitalPlateRuleMessage()
    };
  }
  const artCount = Math.max(1, n(state.form.header.quantityTypes, n(state.form.prepress.artCount, 1)));
  const time = n(state.form.prepress.artsPerHour, 0) > 0 ? r(artCount / n(state.form.prepress.artsPerHour, 0)) : 0;
  return { time, subtotal: r(time * n(state.form.prepress.hourCost, 0)), formulaText: "Tiempo = artes / rendimiento. Costo = tiempo x costo hora.", explanation: "Preprensa convierte la cantidad de tipos en horas segun el rendimiento tecnico configurado para esa etapa." };
}

function calcPlates() {
  if (digitalPlateRuleApplies()) {
    const breakdown = {};
    PLATE_KEYS.forEach((entry) => {
      breakdown[entry.key] = {
        hours: 0,
        materialSubtotal: 0,
        machineSubtotal: 0,
        operatorSubtotal: 0,
        subtotal: 0,
        formulaText: "Costo = 0.",
        explanation: digitalPlateRuleMessage(),
        laserMetrics: entry.key === "laser" ? laserPlateMetrics() : null
      };
    });
    return { subtotal: 0, breakdown, explanation: digitalPlateRuleMessage() };
  }
  let subtotal = 0;
  const breakdown = {};
  PLATE_KEYS.forEach((entry) => {
    const item = state.form.plates[entry.key];
    const laserMetricsValue = entry.key === "laser" ? laserPlateMetrics() : null;
    if (entry.key === "laser") state.form.plates.laser.area = laserMetricsValue.totalArea;
    const hours = entry.key === "laser" ? laserMetricsValue.totalHours : r(n(item.fixedMinutes, 0) / 60);
    const machineSubtotal = r(hours * n(item.costHourMachine, 0));
    const operatorSubtotal = r(hours * n(item.costHourOperator, 0));
    const materialSubtotal = entry.key === "laser" ? r(laserMetricsValue.materialSubtotal) : 0;
    const stepSubtotal = r(materialSubtotal + machineSubtotal + operatorSubtotal);
    subtotal += stepSubtotal;
    breakdown[entry.key] = {
      hours,
      materialSubtotal,
      machineSubtotal,
      operatorSubtotal,
      subtotal: stepSubtotal,
      formulaText: entry.key === "laser" ? "Area por color = (ancho montaje + margen) x ((largo montaje x elongacion) + margen). Area total = area por color x tintas. Costo material = area total x costo por in2. Tiempo total = area total / area procesada por hora. Subtotal = costo material + (tiempo x costo maquina) + (tiempo x costo hora hombre)." : "Tiempo = tiempo fijo o por lote. Subtotal = (tiempo x costo maquina) + (tiempo x costo hora hombre).",
      explanation: entry.key === "laser" ? "El grabado laser ahora sigue el mismo criterio del Excel: consume solo la fraccion real de lamina usada por el trabajo y prorratea el tiempo segun el area que la maquina logra procesar por hora." : "Este subproceso toma un tiempo fijo de operacion y suma tanto el costo de maquina como el costo de la persona.",
      laserMetrics: laserMetricsValue
    };
  });
  return { subtotal: r(subtotal), breakdown, explanation: "Planchas suma los cuatro subprocesos obligatorios y deja visible cuanto aporta cada uno al subtotal final del bloque." };
}

function calcPrint() {
  const base = metrics();
  const stages = activePrintStages();
  const items = stages.map((item) => {
    const machine = findMachine(item.machineId);
    const supportsInline = machineSupportsInline(machine);
    const speedMetersMin = n(item.speedMetersMin, 0);
    const speedUnit = printSpeedUnit(machine);
    const inkCoverage = n(item.coveragePct, 0) / 100;
    const aniloxBcm = n(first(item.aniloxBcm, item.inkGsm), 0);
    const transferFactor = n(item.transferFactor, 0);
    const inkDensity = n(item.inkDensity, 0);
    const inkCostPerLb = n(item.inkCostPerLb, 0);
    const printedAreaIn2 = r((base.printedAreaFt2 || 0) * 144, 6);
    const inkConsumptionPerColorLb = state.form.header.noPrint ? 0 : r((printedAreaIn2 * inkCoverage * aniloxBcm * transferFactor * inkDensity * 0.001) / 453.59237, 6);
    const inkConsumption = state.form.header.noPrint ? 0 : r(inkConsumptionPerColorLb * base.colors, 6);
    const inkSubtotal = r(inkConsumption * inkCostPerLb);
    const inlineItems = INLINE_PRINT_SLOTS.map((slot) => {
      const inline = item.inlineFinishes?.[slot.key] || {};
      const material = findMaterial(inline.materialId);
      const inlineOperatorHourCost = n(item.operatorHourCost, n(state.form.print.operatorHourCost, 0));
      const unitCost = state.form.substrate.unit === "metros"
        ? n(inline.costPerMeter, 0)
        : state.form.substrate.unit === "msi"
          ? n(inline.costPerMsi, 0)
          : n(inline.costPerFoot, 0);
      const materialBase = slot.key === "estampado" ? base.printedAreaM2 : substrateConsumptionValue(state.form, base);
      const setupCost = r((n(inline.setupMinutes, 0) / 60) * inlineOperatorHourCost);
      const varnishCoverage = n(inline.coveragePct, 100) / 100;
      const varnishGsm = n(inline.layerGsm, materialLayerGsm(material, 4));
      const varnishCostPerLb = n(inline.costPerLb, materialCostPerPound(material));
      const materialConsumptionLb = slot.key === "barniz" && inline.active
        ? r((base.printedAreaM2 * varnishCoverage * varnishGsm) / 453.59237, 6)
        : 0;
      const materialSubtotal = slot.key === "barniz"
        ? r(materialConsumptionLb * varnishCostPerLb)
        : slot.usesMaterial && inline.active
          ? r(materialBase * unitCost)
          : 0;
      const plateCost = slot.usesPlateCost && inline.active ? r(n(inline.plateCost, 0)) : 0;
      return {
        ...slot,
        ...inline,
        materialName: material?.descripcion || material?.nombre || "",
        unitCost,
        materialBase,
        materialConsumptionLb,
        coveragePct: n(inline.coveragePct, slot.key === "barniz" ? 100 : 0),
        layerGsm: varnishGsm,
        costPerLb: varnishCostPerLb,
        operatorHourCost: inlineOperatorHourCost,
        setupCost,
        materialSubtotal,
        plateCost,
        subtotal: inline.active && supportsInline ? r(setupCost + materialSubtotal + plateCost + n(inline.fixedCost, 0)) : 0
      };
    });
    const inlineSubtotal = r(inlineItems.reduce((sum, inline) => sum + inline.subtotal, 0));
    const macula = resolvePrintMacula(base, inlineItems);
    const startupWasteFeet = r(n(macula.totalFeet, 0), 2);
    const totalLengthFeet = r(base.linealFeet + startupWasteFeet, 2);
    const totalLengthMeters = r(totalLengthFeet * 0.3048, 4);
    const totalAreaFt2 = r(totalLengthFeet * (n(base.webWidthIn, 0) / 12), 6);
    const setupAdjustmentMin = r(n(item.setupMinutes, 0) + n(item.cleaningMinutes, 0) + n(item.mountingMinutes, 0), 2);
    const runMinutes = printSpeedMinutes(totalLengthFeet, totalLengthMeters, speedMetersMin, machine);
    const totalMinutes = r(runMinutes + setupAdjustmentMin, 2);
    const machineSubtotal = r((totalMinutes / 60) * n(item.costHour, 0));
    const operatorSubtotal = r((totalMinutes / 60) * n(item.operatorHourCost, 0));
    const issues = buildFormulaIssues({
      qty: base.qty,
      cylinderDevelopmentIn: base.cylinderDevelopmentIn,
      acrossCount: base.acrossCount,
      startupWasteFeet,
      webWidthIn: base.webWidthIn,
      speedFtMin: speedUnit === "ft/min" ? speedMetersMin : 0,
      speedMMin: speedUnit === "m/min" ? speedMetersMin : 0,
      setupAdjustmentMin,
      requiresTime: true,
      requiresWaste: true
    });
      return {
        ...item,
        machineSupportsInline: supportsInline,
        colors: base.colors,
        linealFeet: base.linealFeet,
        linealMeters: base.linealMeters,
        startupWasteFeet,
        totalLengthFeet,
        totalLengthMeters,
        totalAreaFt2,
        speedFtMin: speedUnit === "ft/min" ? speedMetersMin : 0,
        speedMMin: speedUnit === "m/min" ? speedMetersMin : 0,
        speedUnit,
        setupAdjustmentMin,
        printedAreaFt2: base.printedAreaFt2,
        runMinutes,
        totalMinutes,
        machineSubtotal,
        operatorSubtotal,
        inkConsumptionPerColorLb,
        inkCoveragePct: n(item.coveragePct, 0),
        aniloxBcm,
        transferFactor,
        inkDensity,
        inkCostPerLb,
        inkConsumption,
        inkSubtotal,
        inlineItems,
        macula,
        issues,
        inlineSubtotal,
        subtotal: r(machineSubtotal + operatorSubtotal + inkSubtotal + inlineSubtotal)
      };
  });
  const machineSubtotal = r(items.reduce((sum, item) => sum + item.machineSubtotal, 0));
  const operatorSubtotal = r(items.reduce((sum, item) => sum + item.operatorSubtotal, 0));
  const inkConsumption = r(items.reduce((sum, item) => sum + item.inkConsumption, 0));
  const inkSubtotal = r(items.reduce((sum, item) => sum + item.inkSubtotal, 0));
  const inlineSubtotal = r(items.reduce((sum, item) => sum + item.inlineSubtotal, 0));
  const maculaSetupFeet = r(items.reduce((sum, item) => sum + n(item.macula?.setupFeet, 0), 0), 2);
  const maculaTirajeFeet = r(items.reduce((sum, item) => sum + n(item.macula?.tirajeFeet, 0), 0), 2);
  const maculaTotalFeet = r(items.reduce((sum, item) => sum + n(item.macula?.totalFeet, 0), 0), 2);
  const totalMinutes = r(items.reduce((sum, item) => sum + item.totalMinutes, 0));
  const runMinutes = r(items.reduce((sum, item) => sum + item.runMinutes, 0));
  return { ...base, items, runMinutes, totalMinutes, machineSubtotal, operatorSubtotal, inkConsumption, inkSubtotal, inlineSubtotal, maculaSetupFeet, maculaTirajeFeet, maculaTotalFeet, subtotal: r(machineSubtotal + operatorSubtotal + inkSubtotal + inlineSubtotal), timeFormula: "Tiempo Total en Máquina (min) = (Longitud Total en pies / Velocidad de Operación en FT/min) + Tiempo de Montaje y Ajuste", inkFormula: "Consumo tinta = área impresa x cobertura x BCM anilox x factor transferencia x densidad tinta x tintas requeridas", explanation: "Impresión ahora calcula el tiempo de corrida usando la longitud total del trabajo, incluyendo la mácula o desperdicio de arranque antes de sumar el tiempo de montaje y ajuste." };
}

function calcFinishes() {
  const base = calcSustrato();
  const items = state.form.finishes.map((item) => {
    const config = EXTERNAL_FINISH_BY_KEY[item.processKey] || {};
    const material = findMaterial(item.materialId);
    const baseLengthFeet = n(base.totalLengthFeet, n(base.linealFeet, 0));
  const runBase = config.key === "troquelado" && n(item.variableBase, 0) > 0
      ? n(item.variableBase, 0) + n(item.setupWasteFeet, 0)
      : baseLengthFeet + n(item.setupWasteFeet, 0);
    const runMinutes = n(item.speed, 0) > 0 ? r(runBase / n(item.speed, 0)) : 0;
    const supplyWidthIn = config.usesUnitMaterial || config.usesWeightMaterial
      ? n(base.webWidthIn, 0)
      : materialSupplyWidthIn(material, base.webWidthIn);
    const wastePct = config.usesUnitMaterial ? n(item.operationWastePct, 0) : n(first(item.operationWastePct, materialWastePct(material)), 0);
    const netMaterialAreaFt2 = r(runBase * (supplyWidthIn / 12), 6);
    const materialAreaFt2 = r(netMaterialAreaFt2 * (1 + (wastePct / 100)), 6);
    const materialBase = config.usesUnitMaterial
      ? Math.max(0, Math.ceil(n(base.rollCount, 0)))
      : materialAreaFt2;
    const areaCostFt2 = n(item.costPerFt2, 0);
    const unitCost = config.usesWeightMaterial
      ? n(item.costPerKg, 0)
      : config.usesUnitMaterial
        ? n(item.costPerUnit, 0)
        : areaCostFt2 > 0
          ? areaCostFt2
          : state.form.substrate.unit === "metros"
            ? n(item.costPerMeter, 0)
            : state.form.substrate.unit === "msi"
              ? n(item.costPerMsi, 0)
              : n(item.costPerFoot, 0);
    const materialConsumptionKg = config.usesWeightMaterial
      ? r((materialBase * n(item.layerGft2, 0)) / 1000, 6)
      : 0;
    const materialSubtotal = config.usesWeightMaterial
      ? r(materialConsumptionKg * unitCost)
      : config.usesMaterial
        ? r(materialBase * unitCost)
        : 0;
    const plateCost = config.usesPlateCost ? r(n(item.plateCost, 0)) : 0;
    const machineSubtotal = r((((n(item.setupMinutes, 0) + runMinutes) / 60) * n(first(item.costHourMachine, item.costHour), 0)) || 0);
    const operatorSubtotal = r((((n(item.setupMinutes, 0) + runMinutes) / 60) * n(item.costHourOperator, 0)) || 0);
    const subtotal = item.active && item.machineId ? r(machineSubtotal + operatorSubtotal + n(item.fixedCost, 0) + (runBase * n(item.variableUnitCost, 0)) + materialSubtotal + plateCost) : 0;
    let formulaText = "Acabado = costo máquina + costo operador + insumos del proceso.";
    let explanation = "El acabado mantiene su montaje, corrida y costos propios.";
    if (item.processKey === "barnizado") {
      formulaText = "Barniz = costo máquina + costo operador + (Área Material ft² x (1 + Merma %) x Rendimiento g/ft² / 1000) x Costo Kg.";
      explanation = "Barnizado usa el área técnica del trabajo, aplica la merma del barniz y luego convierte el depósito en g/ft² a kilogramos antes de valorizarlo.";
    } else if (item.processKey === "laminado") {
      formulaText = "Laminado = costo máquina + costo operador + (Área Material ft² x (1 + Merma %) x costo material ft²).";
      explanation = "Laminado usa el ancho real del laminado, calcula el área técnica del proceso y le aplica la merma del suministro antes de valorizarlo.";
    } else if (item.processKey === "estampado") {
      formulaText = "Estampado = costo máquina + costo operador + (Área Foil ft² x (1 + Merma %) x costo foil ft²) + costo cliché.";
      explanation = "Estampado usa el ancho real del foil, aplica su merma técnica y suma el costo único del cliché del trabajo.";
    } else if (item.processKey === "embosado") {
      formulaText = "Embosado = costo máquina + costo operador + costo cliché.";
      explanation = "Embosado no consume material variable en esta etapa; se valora por tiempo de máquina y costo del cliché.";
    } else if (item.processKey === "troquelado") {
      formulaText = "Troquelado = costo máquina + costo operador + costo base + (base lineal x costo lineal si aplica).";
      explanation = "Troquelado trabaja sobre la longitud total del trabajo y por ahora no incorpora costo adicional de troquel nuevo.";
    } else if (item.processKey === "rebobinado") {
      formulaText = "Rebobinado = costo máquina + costo operador.";
      explanation = "Rebobinado usa el mismo material ya impreso; en esta etapa se valora solo por el tiempo propio de la rebobinadora y la mano de obra.";
    }
    return { ...item, calcBase: runBase, runMinutes, unitCost, supplyWidthIn, wastePct, netMaterialAreaFt2, materialBase, materialConsumptionKg, materialSubtotal, machineSubtotal, operatorSubtotal, plateCost, subtotal, formulaText, explanation };
  });
  return { items, subtotal: r(items.reduce((sum, item) => sum + item.subtotal, 0)) };
}

function calcPackaging() {
  const base = metrics();
  const rolls = n(state.form.packaging.rollCount, base.rollCount);
  const hours = n(state.form.packaging.yieldPerHour, 0) > 0 ? r(rolls / n(state.form.packaging.yieldPerHour, 0)) : 0;
  return { rolls, hours, subtotal: r((hours * n(state.form.packaging.operators, 0) * n(state.form.packaging.hourCost, 0)) + n(state.form.packaging.externalCost, 0)), formulaText: "Tiempo = rollos / rendimiento. Costo = tiempo x operarios x costo hora.", explanation: "Empaque se mide por productividad del area, numero de operarios y cualquier costo externo asociado." };
}

function calcAdditional() {
  const rows = state.form.additional.map((item) => ({ ...item, subtotal: r(n(item.cost, 0)) }));
  return { rows, subtotal: r(rows.reduce((sum, item) => sum + item.subtotal, 0)) };
}

function totals() {
  const macula = calcMacula();
  const troquel = calcTroquel();
  const sustrato = calcSustrato();
  const design = calcDesign();
  const prepress = calcPrepress();
  const plates = calcPlates();
  const print = calcPrint();
  const finishes = calcFinishes();
  const packaging = calcPackaging();
  const additional = calcAdditional();
  const industrial = r(macula.subtotal + sustrato.subtotal + design.subtotal + prepress.subtotal + plates.subtotal + print.subtotal + finishes.subtotal + packaging.subtotal + additional.subtotal);
  const overhead = r(industrial * (1 + n(state.form.commercial.overheadPct, 0) / 100));
  const margin = r(overhead * (1 + n(state.form.commercial.marginPct, 0) / 100));
  const tax = r(margin * (n(state.form.commercial.taxPct, 0) / 100));
  const total = r(margin + tax);
  const quantity = currentQuantity(state.form);
  return { macula, troquel, sustrato, design, prepress, plates, print, finishes, packaging, additional, industrial, overhead, margin, tax, total, unit: quantity > 0 ? r(total / quantity, 6) : 0 };
}

function buildSavePayload() {
  const result = totals();
  const printProductionType = currentPrintProductionType();
  return {
    quoteCode: state.form.header.quoteCode,
    originalLineCode: state.form.header.lineCode,
    lineCode: state.form.header.lineCode,
    customerCode: state.form.header.customerCode,
    customerName: state.form.header.customerName,
    salespersonName: state.form.header.salespersonName,
    processType: state.form.header.noPrint ? "Sin impresion" : printProductionType || state.form.header.processType || "Convencional",
    materialId: state.form.substrate.materialId,
    materialName: findMaterial(state.form.substrate.materialId)?.descripcion || "",
    dieId: state.form.troquel.dieCode,
    machineName: state.form.print.machineName,
    quantityProducts: currentQuantity(state.form),
    quantityTypes: n(state.form.header.quantityTypes, 0),
    quantityChanges: n(state.form.header.quantityChanges, 0),
    widthInches: state.form.header.labelWidthIn,
    lengthInches: state.form.header.labelHeightIn,
    coreWidth: state.form.header.rollWidthIn,
    coreDiameter: state.form.header.coreDiameter,
    labelsPerRoll: n(state.form.header.labelsPerRoll, 0),
    stationCount: effectiveColors(state.form),
    applicationType: state.form.header.applicationType,
    outputType: state.form.header.outputType,
    cmyk: Boolean(state.form.header.useCmyk),
    finalTotal: result.total,
    unitPrice: result.unit,
    lineStatus: state.form.header.lineStatus,
    jobName: state.form.header.jobName,
    department: "Flexografia",
    uiState: JSON.parse(JSON.stringify(state.form))
  };
}

async function persistCalculation() {
  if (!state.form?.header?.quoteCode || !state.form?.header?.lineCode || state.saving) return;
  state.saving = true;
  try {
    await postJson("/api/flexo/calculo/guardar", buildSavePayload());
    els.calcStatus.textContent = `Guardado ${state.form.header.quoteCode} / ${state.form.header.lineCode}.`;
  } catch (error) {
    els.calcStatus.textContent = error.message || "No fue posible guardar el calculo.";
  } finally {
    state.saving = false;
  }
}

function scheduleSave() {
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    state.saveTimer = null;
    persistCalculation();
  }, 500);
}

function renderHeader() {
  fillSelect(els.productType, PRODUCT_TYPES.map((item) => ({ value: item, label: item })), state.form.header.productType);
  fillSelect(els.workType, WORK_TYPES.map((item) => ({ value: item, label: item })), state.form.header.workType);
  fillSelect(els.outputType, outputTypesCatalog().map((item) => ({ value: item.id || item.codigo, label: item.name || item.nombre || item.id || item.codigo })), state.form.header.outputType);
  fillSelect(els.coreDiameter, coreDiameterSelectOptions(), state.form.header.coreDiameter);
  [["customerCode", els.customerCode], ["customerName", els.customerName], ["jobName", els.jobName], ["salespersonName", els.salespersonName], ["labelWidthIn", els.labelWidthIn], ["labelHeightIn", els.labelHeightIn], ["rollWidthIn", els.rollWidthIn], ["coreDiameter", els.coreDiameter], ["labelsPerRoll", els.labelsPerRoll], ["applicationType", els.applicationType], ["applicationEnvironment", els.applicationEnvironment], ["surfaceType", els.surfaceType], ["quantityTypes", els.quantityTypes], ["quantityChanges", els.quantityChanges], ["pantoneCount", els.pantoneCount]].forEach(([key, element]) => { element.value = state.form.header[key] ?? ""; });
  els.useCmyk.checked = Boolean(state.form.header.useCmyk);
  els.useWhiteInk.checked = Boolean(state.form.header.useWhiteInk);
  els.doubleWhitePass.checked = Boolean(state.form.header.doubleWhitePass);
  els.noPrint.checked = Boolean(state.form.header.noPrint);
  els.overheadPct.value = state.form.commercial.overheadPct;
  els.marginPct.value = state.form.commercial.marginPct;
  els.taxPct.value = state.form.commercial.taxPct;
  els.customerNameDisplay.textContent = state.form.header.customerName || "";
  els.salespersonDisplay.textContent = state.form.header.salespersonName || "";
  renderFavoriteDocumentButton();
  syncCustomerCodeWidth();
  renderQuantities();
  outputPreview();
  applyRequiredHighlights();
}

function renderProcessLauncher() {
  const launcherIcon = iconPresentation("processLauncher", "◎", "#0b81b8", 24);
  const refreshIcon = iconPresentation("refreshCosts", "↻", "#5b7896", 20);
  const activeExtras = (state.form?.activeProcessKeys || []).filter((key) => !PROCESS_MENU_BY_KEY[key]?.locked);
  els.processLauncherButton.style.setProperty("--floating-icon-color", launcherIcon.color);
  els.processLauncherButton.style.setProperty("--floating-icon-hover", launcherIcon.hover);
  els.processLauncherButton.style.setProperty("--floating-icon-size", `${launcherIcon.size}px`);
  els.refreshCostsButton?.style.setProperty("--floating-icon-color", refreshIcon.color);
  els.refreshCostsButton?.style.setProperty("--floating-icon-hover", refreshIcon.hover);
  els.refreshCostsButton?.style.setProperty("--floating-icon-size", `${refreshIcon.size}px`);
  const isHidden = els.processLauncherBridge?.hasAttribute("hidden");
  els.processLauncherButton.setAttribute("aria-expanded", isHidden ? "false" : "true");
  if (els.processLauncherLabel) {
    els.processLauncherLabel.textContent = activeExtras.length ? "Procesos" : "Procesos";
  }
  applyIconToContainer(els.processLauncherIcon, launcherIcon.value, "Procesos");
  applyIconToContainer(els.refreshCostsIcon, refreshIcon.value, "Actualizar costos");
  els.processLauncherMenu.innerHTML = PROCESS_MENU
    .filter((item) => !item.locked)
    .map((item) => `<button type="button" class="process-launcher-item" data-process-key="${esc(item.key)}" draggable="true"><strong>${esc(item.label)}</strong></button>`)
    .join("");
  updateProcessLauncherMenuPlacement();
}

function renderTimelineLauncher() {
  if (!els.timelineLauncherButton || !els.timelineLauncherIcon || !els.timelineLauncherPanel) return;
  const timelineIcon = iconPresentation("timelineLauncher", "◴", "#5f7392", 20);
  const isHidden = els.timelineLauncherBridge?.hasAttribute("hidden");
  els.timelineLauncherButton.style.setProperty("--floating-icon-color", timelineIcon.color);
  els.timelineLauncherButton.style.setProperty("--floating-icon-hover", timelineIcon.hover);
  els.timelineLauncherButton.style.setProperty("--floating-icon-size", `${timelineIcon.size}px`);
  els.timelineLauncherButton.setAttribute("aria-expanded", isHidden ? "false" : "true");
  applyIconToContainer(els.timelineLauncherIcon, timelineIcon.value, "Línea de tiempo");
  els.timelineLauncherPanel.innerHTML = `
    <div class="timeline-list">
      ${buildTimelineEntries().map((entry) => `
        <article class="timeline-entry${entry.stamp ? "" : " is-pending"}">
          <div class="timeline-entry-avatar">${esc(initialsFromName(entry.user))}</div>
          <div class="timeline-entry-line"></div>
          <div class="timeline-entry-content">
            <div class="timeline-entry-head">
              <div class="timeline-entry-name-group">
                <strong>${esc(entry.user || "Pendiente")}</strong>
                <span>${esc(entry.role || "")}</span>
              </div>
              <time>${esc(formatTimelineStamp(entry.stamp))}</time>
            </div>
            <div class="timeline-entry-detail">${esc(entry.detail || entry.title)}</div>
            ${entry.comment ? `<div class="timeline-entry-comment">${esc(entry.comment)}</div>` : ""}
          </div>
          <div class="timeline-entry-check${entry.stamp ? " is-done" : ""}"></div>
        </article>
      `).join("")}
    </div>
    <button type="button" id="timelineReportButton" class="timeline-report-button">Notificar problema</button>
  `;
  els.timelineLauncherLabel.textContent = "";
  updateProcessLauncherMenuPlacement();
}

function updateProcessLauncherMenuPlacement() {
  if (!els.processLauncherShell || !els.processLauncherPrimary || !els.processLauncherBridge) return;
  const shellRect = els.processLauncherShell.getBoundingClientRect();
  const sectionsRect = els.processSections?.getBoundingClientRect?.();
  const shellCenterX = shellRect.left + (shellRect.width / 2);
  const processCenterX = sectionsRect ? sectionsRect.left + (sectionsRect.width / 2) : (window.innerWidth || document.documentElement.clientWidth || 1280) / 2;
  const openTowardRight = shellCenterX <= processCenterX;
  els.processLauncherPrimary.classList.toggle("launcher-menu-right", openTowardRight);
  els.processLauncherPrimary.classList.toggle("launcher-menu-left", !openTowardRight);
  els.timelineLauncherPrimary?.classList.toggle("launcher-menu-right", openTowardRight);
  els.timelineLauncherPrimary?.classList.toggle("launcher-menu-left", !openTowardRight);
}

function injectProcessRemoveButtons() {
  els.processSections.querySelectorAll(".process-card").forEach((cardNode) => {
    const key = cardNode.dataset.processKey;
    if (!key || PROCESS_MENU_BY_KEY[key]?.locked) return;
    if (cardNode.querySelector(".process-remove-button")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "process-remove-button";
    button.dataset.action = "remove-process";
    button.dataset.removeType = "single";
    button.dataset.removeIndex = key;
    button.setAttribute("aria-label", "Eliminar proceso");
    button.innerHTML = '<span class="trash-icon" aria-hidden="true"></span>';
    cardNode.appendChild(button);
  });
}

function renderSidebar(result) {
  const material = findMaterial(state.form.substrate.materialId);
  const printProcess = findProcess(state.form.print.processId);
  const quantities = normalizeQuantities(state.form.header.quantities).map((item) => num(item.value, 0)).join(" │ ");
  const processProductiveType = currentPrintProductionType() || (state.form.header.noPrint ? "Sin impresion" : state.form.header.processType || "Flexografia");
  const plateRule = digitalPlateRuleApplies() ? "Planchas no se cobran" : "Planchas sí se cobran";
  const statusBase = state.form.header.quoteCode && state.form.header.lineCode ? `Evaluando ${state.form.header.quoteCode} / ${state.form.header.lineCode}.` : "Evaluando calculo de flexografia.";
  els.calcStatus.textContent = digitalPlateRuleApplies() ? `${statusBase} ${digitalPlateRuleMessage()}` : statusBase;
  els.contextRows.innerHTML = [["Cotizacion", state.form.header.quoteCode || "Sin base"], ["Linea", state.form.header.lineCode || "Sin base"], ["Cantidades productos", quantities || "Sin definir"], ["Cantidad base", num(currentQuantity(state.form), 0)], ["Troquel", state.form.troquel.dieCode || "No definido"], ["Sustrato", material?.descripcion || "No definido"], ["Maquina impresion", printProcess?.machine_name || state.form.print.machineName || "No definida"], ["Proceso productivo", processProductiveType], ["Regla planchas", plateRule], ["Estado linea", state.form.header.lineStatus || "En evaluacion"]].map(([label, value]) => `<div class="summary-row"><span>${esc(label)}</span><span class="summary-row-value">${esc(value)}</span></div>`).join("");
  els.summaryRows.innerHTML = [["Mácula", money(result.macula.subtotal)], ["Sustrato", money(result.sustrato.subtotal)], ["Diseno", money(result.design.subtotal)], ["Preprensa", money(result.prepress.subtotal)], ["Planchas", money(result.plates.subtotal)], ["Impresion", money(result.print.subtotal)], ["Acabados", money(result.finishes.subtotal)], ["Empaque", money(result.packaging.subtotal)], ["Adicionales", money(result.additional.subtotal)], ["Costo total industrial", money(result.industrial)], ["Total con ajustes", money(result.total)], ["Unitario base", money(result.unit)]].map(([label, value]) => `<div class="summary-row"><span>${esc(label)}</span><span class="summary-row-value">${esc(value)}</span></div>`).join("");
}

function applyDefaultLauncherPosition() {
  if (!els.processLauncherShell) return;
  const technicalCard = document.getElementById("technicalDataCard");
  if (!technicalCard) return;
  const rect = technicalCard.getBoundingClientRect();
  const shellWidth = els.processLauncherShell.offsetWidth || 64;
  const shellHeight = els.processLauncherShell.offsetHeight || 190;
  const width = window.innerWidth || document.documentElement.clientWidth || 1280;
  const height = window.innerHeight || document.documentElement.clientHeight || 720;
  const left = Math.min(Math.max(8, rect.left - shellWidth - 16), Math.max(8, width - shellWidth - 8));
  const top = Math.min(Math.max(96, rect.top + 16), Math.max(8, height - shellHeight - 8));
  els.processLauncherShell.style.left = `${left}px`;
  els.processLauncherShell.style.top = `${top}px`;
  els.processLauncherShell.style.bottom = "auto";
}

function renderPlateStep(entry, plates) {
  const item = state.form.plates[entry.key];
  const step = plates.breakdown[entry.key];
  const machineChoices = plateMachines(entry);
  const machineOptions = machineChoices.length ? machineChoices.map((machine) => ({ id: machine.id, nombre: machineDisplayName(machine) })) : [{ id: item.processId || entry.key, nombre: item.machineName || entry.machine }];

  if (entry.key !== "laser") {
    return `<section class="subprocess-card"><div class="subprocess-head"><strong>${esc(entry.label)}</strong><span>${money(step.subtotal)}</span></div><div class="editable-grid plate-grid"><label class="span-2"><span>Maquina</span><select data-scope="plates.${entry.key}" data-field="processId">${processOptions(machineOptions, item.processId)}</select></label><label><span>Costo hora maquina</span><input data-scope="plates.${entry.key}" data-field="costHourMachine" type="number" step="0.01" value="${esc(item.costHourMachine)}"></label><label><span>Costo hora hombre</span><input data-scope="plates.${entry.key}" data-field="costHourOperator" type="number" step="0.01" value="${esc(item.costHourOperator)}"></label><label><span>Tiempo proceso (min)</span><input data-scope="plates.${entry.key}" data-field="fixedMinutes" type="number" step="0.01" value="${esc(item.fixedMinutes)}"></label><label><span>Subtotal</span><input type="text" value="${esc(money(step.subtotal))}" readonly></label></div><div class="readonly-grid compact-top step-metrics">${metric("Tiempo", `${num(step.hours, 2)} h`)}${metric("Costo maquina", money(step.machineSubtotal))}${metric("Costo hombre", money(step.operatorSubtotal))}${metric("Subtotal", money(step.subtotal))}</div>${formula(entry.label, step.formulaText, step.explanation)}</section>`;
  }

  const laser = step.laserMetrics || laserPlateMetrics();
  const stockOptions = plateStockMaterials(item.processId).map((material) => ({ id: material.id, nombre: material.descripcion || material.nombre || material.codigo || material.id }));
  return `<section class="subprocess-card"><div class="subprocess-head"><strong>${esc(entry.label)}</strong><span>${money(step.subtotal)}</span></div><div class="editable-grid plate-grid plate-grid-laser"><label class="span-2"><span>Maquina</span><select class="${laser.missing.machine ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="processId">${processOptions(machineOptions, item.processId)}</select></label><label class="span-2"><span>Plancha virgen</span><select class="${laser.missing.material ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="materialId">${processOptions(stockOptions, item.materialId)}</select></label><label><span>Costo hora maquina</span><input class="${laser.missing.costHourMachine ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="costHourMachine" type="number" step="0.01" value="${esc(item.costHourMachine)}"></label><label><span>Costo hora hombre</span><input class="${laser.missing.costHourOperator ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="costHourOperator" type="number" step="0.01" value="${esc(item.costHourOperator)}"></label><label><span>Planchas por hora</span><input class="${laser.missing.speed ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="speed" type="number" step="0.0001" value="${esc(item.speed)}"></label><label><span>Margen pegado (in)</span><input data-scope="plates.${entry.key}" data-field="safetyMarginIn" type="number" step="0.0001" value="${esc(item.safetyMarginIn)}"></label></div><div class="readonly-grid compact-top plate-metrics-grid">${metricBox("Ancho montaje", laser.mountWidthIn > 0 ? `${num(laser.mountWidthIn, 2)} in` : "Pendiente", laser.missing.mountWidthIn, laser.hasAbsurdData)}${metricBox("Largo montaje", laser.mountLengthIn > 0 ? `${num(laser.mountLengthIn, 2)} in` : "Pendiente", laser.missing.mountLengthIn, laser.hasAbsurdData)}${metricBox("Elongacion", laser.elongationPct > 0 ? `${num(laser.elongationPct, 2)} %` : "Pendiente", laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Tintas activas", laser.totalColors > 0 ? num(laser.totalColors, 0) : "Pendiente", laser.missing.totalColors, laser.hasAbsurdData)}${metricBox("Ancho real", laser.realWidthIn > 0 ? `${num(laser.realWidthIn, 2)} in` : "Pendiente", laser.missing.mountWidthIn, laser.hasAbsurdData)}${metricBox("Largo real", laser.realLengthIn > 0 ? `${num(laser.realLengthIn, 4)} in` : "Pendiente", laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Area por color", laser.areaPerColor > 0 ? `${num(laser.areaPerColor, 4)} in²` : "Pendiente", laser.missing.mountWidthIn || laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Area total trabajo", laser.totalArea > 0 ? `${num(laser.totalArea, 4)} in²` : "Pendiente", laser.missing.totalColors || laser.missing.mountWidthIn || laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Ancho lamina", laser.sheetWidthIn > 0 ? `${num(laser.sheetWidthIn, 2)} in` : "Pendiente", laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Largo lamina", laser.sheetLengthIn > 0 ? `${num(laser.sheetLengthIn, 2)} in` : "Pendiente", laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Area lamina", laser.sheetAreaIn2 > 0 ? `${num(laser.sheetAreaIn2, 0)} in²` : "Pendiente", laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Costo lamina", laser.sheetCost > 0 ? money(laser.sheetCost) : "Pendiente", laser.missing.sheetCost, laser.hasAbsurdData)}${metricBox("Fraccion de lamina", laser.sheetFraction > 0 ? num(laser.sheetFraction, 4) : "Pendiente", laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Costo plancha por in²", laser.costPerIn2 > 0 ? `$${num(laser.costPerIn2, 4)}` : "Pendiente", laser.missing.sheetAreaIn2 || laser.missing.sheetCost, laser.hasAbsurdData)}${metricBox("Area procesada por hora", laser.processedAreaPerHour > 0 ? `${num(laser.processedAreaPerHour, 0)} in²` : "Pendiente", laser.missing.speed || laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Hora utilizada", laser.hourUsagePct > 0 ? `${num(laser.hourUsagePct, 2)} %` : "Pendiente", laser.missing.speed || laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Tiempo total", laser.totalMinutes > 0 ? `${num(laser.totalMinutes, 2)} min` : "Pendiente", laser.missing.speed || laser.missing.sheetAreaIn2, laser.hasAbsurdData)}</div><div class="readonly-grid compact-top step-metrics">${metric("Costo material", money(step.materialSubtotal || 0))}${metric("Costo maquina", money(step.machineSubtotal))}${metric("Costo hombre", money(step.operatorSubtotal))}${metric("Subtotal", money(step.subtotal))}</div>${formula(entry.label, step.formulaText, step.explanation)}</section>`;
}

function renderInlinePrintBlock(stage, stageIndex, inline) {
  const materialOptions = materialsByClassification(inline.materialFamily, inline.materialKeywords || []).map((item) => ({ id: item.id, nombre: item.descripcion || item.nombre || item.id }));
  const scope = `printStages.${stageIndex}.inlineFinishes.${inline.key}`;
  const configZone = `<div class="process-zone"><div class="process-zone-head"><h4>Parámetros de Configuración</h4></div><div class="process-finish-grid">${inline.key === "barniz" ? `<label class="span-2"><span>Tipo de Barniz</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, inline.materialId)}</select></label><label><span>Cobertura Barniz</span>${displayInput(scope, "coveragePct", inline.coveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>GSM Barniz</span>${displayInput(scope, "layerGsm", inline.layerGsm, { maximumFractionDigits: 4 })}</label><label><span>Costo Libra</span>${displayInput(scope, "costPerLb", inline.costPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label>` : ""}<label><span>Montaje</span>${displayInput(scope, "setupMinutes", inline.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label>${inline.usesMaterial && inline.key !== "barniz" ? `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, inline.materialId)}</select></label><label><span>Costo Pie</span>${displayInput(scope, "costPerFoot", inline.costPerFoot, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Costo Metro</span>${displayInput(scope, "costPerMeter", inline.costPerMeter, { prefix: "$", maximumFractionDigits: 6 })}</label>` : ""}${inline.usesPlateCost ? `<label><span>Costo Cliché</span>${displayInput(scope, "plateCost", inline.plateCost, { prefix: "$", maximumFractionDigits: 2 })}</label>` : ""}<label class="span-2"><span>Comentario</span><input data-scope="${scope}" data-field="comment" type="text" value="${esc(inline.comment || "")}"></label></div></div>`;
  const metricsZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Resumen</h4></div><div class="process-kpi-grid">${metric("Montaje", `${num(inline.setupMinutes, 2)} min`)}${inline.key === "barniz" ? metric("Consumo Barniz", `${num(inline.materialConsumptionLb || 0, 4)} lb`) : ""}${inline.usesMaterial || inline.key === "barniz" ? metric("Material", esc(inline.materialName || "Sin definir")) : ""}${inline.usesMaterial || inline.key === "barniz" ? metric("Subtotal Material", money(inline.materialSubtotal)) : ""}${inline.usesPlateCost ? metric("Costo Cliché", money(inline.plateCost)) : ""}${metricWithInfo("Subtotal", money(inline.subtotal), `Cálculo ${inline.label}`, `Subtotal = montaje + insumos + costos únicos del subproceso.`)}</div></div>`;
  return `<details class="subprocess-card inline-process-card" data-open-key="${esc(scope)}"><summary class="inline-process-summary"><div class="inline-process-heading"><label class="inline-process-check"><input data-scope="printStages.${stageIndex}.inlineFinishes.${inline.key}" data-field="active" type="checkbox"${inline.active ? " checked" : ""}><span>${esc(inline.label)}</span></label></div><div class="process-summary-side"><em>${money(inline.subtotal)}</em></div></summary><div class="process-body"><div class="process-layout process-layout-inline"><div class="process-layout-main">${configZone}</div><div class="process-layout-side">${metricsZone}</div></div></div></details>`;
}

function renderInlineToggleBar(stageIndex, inlineItems) {
  return `<div class="inline-toggle-bar">${inlineItems.map((inline) => `<label class="inline-toggle-chip"><input data-scope="printStages.${stageIndex}.inlineFinishes.${inline.key}" data-field="active" type="checkbox"${inline.active ? " checked" : ""}><span>${esc(inline.label)}</span></label>`).join("")}</div>`;
}

function renderPrintStageCard(item, printItem, index, orderNumber) {
  const stageMachine = findMachine(item.machineId);
  const stagePrintOptions = printMachineOptions(item.machineId);
  const inlineZone = machineSupportsInline(stageMachine)
    ? `<div class="process-zone inline-zone-shell"><div class="process-zone-head"><h4>Subprocesos Acabados Impresión</h4></div><div class="subprocess-stack inline-print-stack">${(printItem.inlineItems || []).map((inline) => renderInlinePrintBlock(item, index, inline)).join("")}</div></div>`
    : `<div class="inline-toggle-note">Los subprocesos En Línea solo aplican a máquinas de impresión convencional o híbrida.</div>`;
  const scope = `printStages.${index}`;
  const speedDisplayValue = n(item.speedMetersMin, 0);
  const speedUnit = printSpeedUnit(stageMachine);
  const configZone = `<div class="process-zone"><div class="process-zone-head"><h4>Parámetros de Configuración</h4></div><div class="process-machine-row"><label class="span-2"><span>Máquina</span><select data-scope="${scope}" data-field="machineId">${processOptions(stagePrintOptions, item.machineId)}</select></label></div><div class="process-subsection"><h5>Producción</h5><div class="process-print-grid process-print-grid-production"><label><span>Setup</span>${displayInput(scope, "setupMinutes", item.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Limpieza</span>${displayInput(scope, "cleaningMinutes", item.cleaningMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Montaje</span>${displayInput(scope, "mountingMinutes", item.mountingMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Velocidad</span>${displayInput(scope, "speedMetersMin", item.speedMetersMin, { suffix: speedUnit, maximumFractionDigits: 2, inputValue: speedDisplayValue, displayValue: speedDisplayValue })}</label><label><span>Cantidad Estaciones</span>${displayInput(scope, "availableColors", item.availableColors, { integer: true, maximumFractionDigits: 0, step: "1" })}</label><label><span>Costo Máquina</span>${displayInput(scope, "costHour", item.costHour, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Costo Operador</span>${displayInput(scope, "operatorHourCost", item.operatorHourCost, { prefix: "$", maximumFractionDigits: 2 })}</label></div></div><div class="process-subsection process-subsection-ink"><h5>Cálculo de Tinta</h5><div class="process-print-grid process-print-grid-ink"><label><span>Cobertura Tinta</span>${displayInput(scope, "coveragePct", item.coveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>Cobertura Diseño</span>${displayInput(scope, "designCoveragePct", item.designCoveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>BCM Genérico</span>${displayInput(scope, "bcmGenerico", item.bcmGenerico, { maximumFractionDigits: 4 })}</label><label><span>BCM Anilox</span>${displayInput(scope, "aniloxBcm", item.aniloxBcm, { maximumFractionDigits: 4 })}</label><label><span>GSM Tinta</span>${displayInput(scope, "inkGsm", item.inkGsm, { maximumFractionDigits: 4 })}</label><label><span>Factor Transferencia</span>${displayInput(scope, "transferFactor", item.transferFactor, { maximumFractionDigits: 4 })}</label><label><span>Densidad Tinta</span>${displayInput(scope, "inkDensity", item.inkDensity, { maximumFractionDigits: 4 })}</label><label><span>Costo Lb CMYK</span>${displayInput(scope, "inkCostPerLb", item.inkCostPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label><label><span>Costo Lb Blanco</span>${displayInput(scope, "whiteInkCostPerLb", item.whiteInkCostPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label><label><span>Costo Lb Pantone</span>${displayInput(scope, "pantoneInkCostPerLb", item.pantoneInkCostPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label></div><div class="process-inline-table-shell">${renderInkProfiles(scope, item.inkProfiles || [])}</div></div></div>`;
  const costInfo = "Tiempo total = setup + limpieza + montaje + proceso lineal. Consumo tinta = área impresa x cobertura x BCM anilox x factor transferencia x densidad tinta x tintas requeridas.";
  const metricsZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Indicadores del Proceso</h4></div><div class="process-kpi-grid">${metricBox("Pies Netos", printItem.linealFeet > 0 ? `${num(printItem.linealFeet || 0, 2)} pies` : "Pendiente", n(printItem.linealFeet, 0) <= 0)}${metricBox("Desperdicio de Arranque", printItem.startupWasteFeet > 0 ? `${num(printItem.startupWasteFeet || 0, 2)} pies` : "Pendiente", (printItem.issues || []).some((issue) => issue.includes("Desperdicio de Arranque")))}${metricBox("Longitud Total", printItem.totalLengthFeet > 0 ? `${num(printItem.totalLengthFeet || 0, 2)} pies` : "Pendiente", (printItem.issues || []).length > 0)}${metricBox("Tiempo Total", printItem.totalMinutes > 0 ? `${num(printItem.totalMinutes || 0, 2)} min` : "Pendiente", (printItem.issues || []).some((issue) => issue.includes("Velocidad") || issue.includes("Montaje y Ajuste")))}${metric("Tintas Requeridas", num(printItem.colors || 0, 0))}${metric("Consumo Tinta", `${num(printItem.inkConsumption || 0, 4)} lb`)}</div>${issueList("Problemas detectados en la fórmula", printItem.issues || [])}</div>`;
  const maculaRowLabel = printItem.macula?.tirajeRow?.detalle || "Impresión";
  const maculaZone = `<div class="process-zone process-zone-macula"><div class="process-zone-head"><h4>Mácula</h4></div><div class="process-kpi-grid process-kpi-grid-macula">${metric("Mácula Setup", `${num(printItem.macula?.setupFeet || 0, 2)} pies`)}${metric("Mácula Tiraje", `${num(printItem.macula?.tirajeFeet || 0, 2)} pies`)}${metric("Mácula Total", `${num(printItem.macula?.totalFeet || 0, 2)} pies`)}${metric("Base Tiraje", `${num(printItem.macula?.tirajePct || 0, 2)} %`)}</div><div class="process-macula-caption">${esc(maculaRowLabel)}</div></div>`;
  const costZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Desglose de Costos</h4></div><div class="summary-rows process-cost-summary">${summaryRowWithInfo("Costo Máquina", money(printItem.machineSubtotal || 0), "Costo Máquina", costInfo)}${summaryRowWithInfo("Costo Operador", money(printItem.operatorSubtotal || 0), "Costo Operador", costInfo)}${summaryRowWithInfo("Costo Tinta", money(printItem.inkSubtotal || 0), "Costo Tinta", costInfo)}${summaryRowWithInfo("Subprocesos En Línea", money(printItem.inlineSubtotal || 0), "Subprocesos En Línea", "Subtotal de acabados activados dentro de la misma línea de impresión.")}<div class="summary-row process-row-total"><span>Subtotal Impresión</span><strong>${money(printItem.subtotal || 0)}</strong></div></div></div>`;
  const speedLengthUnit = speedUnit === "m/min" ? "metros" : "pies";
  const body = `<div class="process-layout process-layout-print"><div class="process-layout-main">${configZone}</div><div class="process-layout-side">${metricsZone}${maculaZone}${costZone}</div></div><div class="inline-print-zone">${inlineZone}</div>${formula("Fórmula de Tiempo Total", `Tiempo Total en Máquina (min) = (Longitud Total en ${speedLengthUnit} / Velocidad de Operación en ${speedUnit}) + Tiempo de Montaje y Ajuste`, "La longitud total de impresión suma la mácula y luego se divide entre la velocidad real de operación. Después se agrega el tiempo de preparación, limpieza y montaje.")}`;
  return card(`impresion-${item.id || index + 1}`, `${orderNumber}. Impresión`, item.machineName || "Máquina de impresión", printItem.subtotal || 0, body, { removable: true, removeType: "print-stage", removeIndex: index });
}

function renderExternalFinishCard(config, finish, index, orderNumber) {
  const materialOptions = materialsByClassification(config.materialFamily, config.materialKeywords || []).map((item) => ({ id: item.id, nombre: item.descripcion || item.nombre || item.id }));
  const machineOptions = finishMachineOptions(config, finish.machineId);
  const scope = `finishes.${index}`;
  const speedSuffix = "FT/min";
  const displayTotalMinutes = r(n(finish.setupMinutes, 0) + n(finish.runMinutes, 0), 6);
  const processMachineCost = r((displayTotalMinutes / 60) * n(first(finish.costHourMachine, finish.costHour), 0), 4);
  const processOperatorCost = r((displayTotalMinutes / 60) * n(finish.costHourOperator, 0), 4);
  const linearCost = r((n(finish.calcBase, 0) * n(finish.variableUnitCost, 0)) || 0, 4);
  const showBaseCost = config.key === "troquelado" && n(finish.fixedCost, 0) > 0;
  const showLinearCost = config.key === "troquelado";
  const machineFields = [
    `<label class="span-2"><span>Máquina</span><select data-scope="${scope}" data-field="machineId">${processOptions(machineOptions, finish.machineId)}</select></label>`,
    `<label><span>Montaje</span>${displayInput(scope, "setupMinutes", finish.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Velocidad</span>${displayInput(scope, "speed", finish.speed, { suffix: speedSuffix, maximumFractionDigits: 4 })}</label>`,
    `<label><span>Costo Máquina</span>${displayInput(scope, "costHourMachine", finish.costHourMachine, { prefix: "$", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Costo Operador</span>${displayInput(scope, "costHourOperator", finish.costHourOperator, { prefix: "$", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Merma Ajuste</span>${displayInput(scope, "setupWasteFeet", finish.setupWasteFeet, { suffix: "ft", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Merma Operación</span>${displayInput(scope, "operationWastePct", finish.operationWastePct, { suffix: "%", maximumFractionDigits: 2 })}</label>`
  ];
  const plateFields = [];
  const materialFields = [];
  if (config.usesWeightMaterial) {
    materialFields.push(
      `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, finish.materialId)}</select></label>`,
      `<label><span>Rendimiento g/ft²</span>${displayInput(scope, "layerGft2", finish.layerGft2, { maximumFractionDigits: 6 })}</label>`,
      `<label><span>Costo Kg</span>${displayInput(scope, "costPerKg", finish.costPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label>`
    );
  } else if (config.usesUnitMaterial) {
    materialFields.push(
      `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, finish.materialId)}</select></label>`,
      `<label><span>Costo Unidad</span>${displayInput(scope, "costPerUnit", finish.costPerUnit, { prefix: "$", maximumFractionDigits: 6 })}</label>`
    );
  } else if (config.usesMaterial) {
    materialFields.push(
      `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, finish.materialId)}</select></label>`,
      `<label><span>Costo ft²</span>${displayInput(scope, "costPerFt2", finish.costPerFt2, { prefix: "$", maximumFractionDigits: 6 })}</label>`
    );
  }
  if (showLinearCost) {
    machineFields.push(`<label><span>Costo Lineal</span>${displayInput(scope, "variableUnitCost", finish.variableUnitCost, { prefix: "$", maximumFractionDigits: 6 })}</label>`);
  }
  if (showBaseCost) {
    machineFields.push(`<label><span>Costo Base</span>${displayInput(scope, "fixedCost", finish.fixedCost, { prefix: "$", maximumFractionDigits: 2 })}</label>`);
  }
  if (config.usesPlateCost) {
    plateFields.push(
      `<label><span>Ancho Cliché</span>${displayInput(scope, "plateWidthIn", finish.plateWidthIn, { suffix: "in", maximumFractionDigits: 4 })}</label>`,
      `<label><span>Largo Cliché</span>${displayInput(scope, "plateLengthIn", finish.plateLengthIn, { suffix: "in", maximumFractionDigits: 4 })}</label>`
    );
    plateFields.push(`<label><span>Costo Cliché</span>${displayInput(scope, "plateCost", finish.plateCost, { prefix: "$", maximumFractionDigits: 2 })}</label>`);
  }
  const configZone = `<div class="process-zone"><div class="process-zone-head"><h4>Parámetros de Configuración</h4></div><div class="process-finish-grid">${machineFields.join("")}${plateFields.join("")}${materialFields.join("")}<label class="span-4"><span>Comentario</span><input data-scope="${scope}" data-field="comment" type="text" value="${esc(finish.comment || "")}"></label></div></div>`;
  const indicatorMetrics = [
    metric("Base de Corrida", `${num(finish.calcBase || 0, 2)} pies`),
    metric("Tiempo Total", `${num(displayTotalMinutes, 2)} min`)
  ];
  if (config.usesUnitMaterial) {
    indicatorMetrics.push(metric("Cantidad Rollos", `${num(finish.materialBase || 0, 0)} unid`));
  } else if (config.usesMaterial) {
    indicatorMetrics.push(metric("Base Material", `${num(finish.materialBase || 0, 2)} ft²`));
    indicatorMetrics.push(metric("Ancho Material", `${num(finish.supplyWidthIn || 0, 2)} in`));
    indicatorMetrics.push(metric("Merma Operación", `${num(finish.wastePct || 0, 2)} %`));
  }
  indicatorMetrics.push(metric("Merma Ajuste", `${num(finish.setupWasteFeet || 0, 2)} ft`));
  if (config.usesWeightMaterial) {
    indicatorMetrics.push(metric("Consumo Material", `${num(finish.materialConsumptionKg || 0, 4)} kg`));
  }
  if (config.usesMaterial) {
    indicatorMetrics.push(metric("Subtotal Material", money(finish.materialSubtotal || 0)));
  }
  if (showLinearCost) {
    indicatorMetrics.push(metric("Costo Lineal", money(linearCost)));
  }
  if (config.usesPlateCost) {
    indicatorMetrics.push(metric("Costo Cliché", money(finish.plateCost || 0)));
    indicatorMetrics.push(metric("Dimensión Cliché", `${num(finish.plateWidthIn || 0, 2)} x ${num(finish.plateLengthIn || 0, 2)} in`));
  }
  const indicatorZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Indicadores del Proceso</h4></div><div class="process-kpi-grid">${indicatorMetrics.join("")}</div></div>`;
  const finishCostInfo = finish.explanation || "El subtotal combina el tiempo del proceso y los insumos propios del acabado.";
  const costRows = [
    summaryRowWithInfo("Costo Máquina", money(processMachineCost), "Costo Máquina", finishCostInfo),
    summaryRowWithInfo("Costo Operador", money(processOperatorCost), "Costo Operador", finishCostInfo)
  ];
  if (showBaseCost) {
    costRows.push(summaryRowWithInfo("Costo Base", money(finish.fixedCost || 0), "Costo Base", finishCostInfo));
  }
  if (showLinearCost) {
    costRows.push(summaryRowWithInfo("Costo Lineal", money(linearCost), "Costo Lineal", finishCostInfo));
  }
  if (config.usesMaterial) {
    costRows.push(summaryRowWithInfo("Costo Material", money(finish.materialSubtotal || 0), "Costo Material", finishCostInfo));
  }
  if (config.usesPlateCost) {
    costRows.push(summaryRowWithInfo("Costo Cliché", money(finish.plateCost || 0), "Costo Cliché", finishCostInfo));
  }
  costRows.push(`<div class="summary-row process-row-total"><span>Subtotal ${esc(config.label)}</span><strong>${money(finish.subtotal || 0)}</strong></div>`);
  const costZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Desglose de Costos</h4></div><div class="summary-rows process-cost-summary">${costRows.join("")}</div></div>`;
  const body = `<div class="process-layout process-layout-print"><div class="process-layout-main">${configZone}</div><div class="process-layout-side">${indicatorZone}${costZone}</div></div>`;
  return card(`${config.key}-${index}`, `${orderNumber}. ${config.label}`, finish.machineName || finish.description || config.label, finish.subtotal, body, { removable: true, removeType: "finish-instance", removeIndex: index });
}

function renderMaculaMontajeRows(rows = []) {
  if (!rows.length) return `<div class="macula-empty">Sin parámetros de montaje cargados en Costos.</div>`;
  return `<div class="macula-table"><div class="macula-table-head macula-table-row"><span>Detalle</span><span>Por Estación</span><span>Cantidad Tintas</span><span>Total Pies</span></div>${rows.map((row, index) => `<div class="macula-table-row"><input data-scope="macula.montajeRows.${index}" data-field="detalle" type="text" value="${esc(row.detalle || "")}"><input data-scope="macula.montajeRows.${index}" data-field="porEstacion" type="number" step="0.01" value="${esc(row.porEstacion)}"><input data-scope="macula.montajeRows.${index}" data-field="cantidadTintas" type="number" step="1" value="${esc(row.cantidadTintas)}"><input data-scope="macula.montajeRows.${index}" data-field="totalPies" type="number" step="0.01" value="${esc(row.totalPies)}"></div>`).join("")}</div>`;
}

function renderMaculaTirajeRows(rows = []) {
  if (!rows.length) return `<div class="macula-empty">Sin parámetros de tiraje cargados en Costos.</div>`;
  return `<div class="macula-table"><div class="macula-table-head macula-table-row macula-table-row-short"><span>Detalle</span><span>Porcentaje</span></div>${rows.map((row, index) => `<div class="macula-table-row macula-table-row-short"><input data-scope="macula.tirajeRows.${index}" data-field="detalle" type="text" value="${esc(row.detalle || "")}"><input data-scope="macula.tirajeRows.${index}" data-field="porcentaje" type="number" step="0.01" value="${esc(row.porcentaje)}"></div>`).join("")}</div>`;
}

function renderInkProfiles(scope, profiles = []) {
  if (!profiles.length) return `<div class="macula-empty">Sin perfiles cargados en Costos.</div>`;
  return `<div class="ink-profile-table"><div class="ink-profile-head ink-profile-row"><span>Tipo de Trabajo</span><span>BCM</span><span>Cobertura %</span><span>GSM</span></div>${profiles.map((row, index) => `<div class="ink-profile-row"><input data-scope="${scope}.inkProfiles.${index}" data-field="tipo" type="text" value="${esc(row.tipo || "")}"><input data-scope="${scope}.inkProfiles.${index}" data-field="bcm" type="number" step="0.01" value="${esc(row.bcm)}"><input data-scope="${scope}.inkProfiles.${index}" data-field="coveragePct" type="number" step="0.01" value="${esc(row.coveragePct)}"><input data-scope="${scope}.inkProfiles.${index}" data-field="gsm" type="number" step="0.01" value="${esc(row.gsm)}"></div>`).join("")}</div>`;
}

function renderProcesses() {
  const focusSnapshot = captureFocus();
  snapshotOpenProcesses();
  state.form.header.quantity = currentQuantity(state.form);
  const result = totals();
  const macula = result.macula;
  const troquel = result.troquel;
  const sustrato = result.sustrato;
  const design = result.design;
  const prepress = result.prepress;
  const plates = result.plates;
  const print = result.print;
  const finishes = result.finishes;
  const packaging = result.packaging;
  const additional = result.additional;
  const material = findMaterial(state.form.substrate.materialId);
  const digitalProcessNote = digitalProcessInlineNote();
  const dieOptions = (state.catalogs.troqueles || []).map((item) => ({ id: item.codigoTroquel || item.id, nombre: `${item.codigoTroquel || item.id} ${item.descripcion ? `- ${item.descripcion}` : ""}`.trim() }));
  let orderNumber = 1;
  const sections = [];
  const pushSection = (markup) => {
    if (markup) sections.push(markup);
  };
  const nextTitle = (label) => `${orderNumber++}. ${label}`;
  pushSection(card("macula", nextTitle("Mácula"), "", macula.subtotal, `<div class="process-zone"><div class="process-zone-head"><h4>Mácula Montaje</h4></div>${renderMaculaMontajeRows(state.form.macula?.montajeRows || [])}</div><div class="process-zone"><div class="process-zone-head"><h4>Mácula Tiraje</h4></div>${renderMaculaTirajeRows(state.form.macula?.tirajeRows || [])}</div>`));
  pushSection(card("troquel", nextTitle("Troquel"), state.form.troquel.dieDescription, troquel.subtotal, `<div class="editable-grid"><label class="span-2"><span>Troquel</span><select data-scope="troquel" data-field="dieCode">${processOptions(dieOptions, state.form.troquel.dieCode)}</select></label></div><div class="readonly-grid compact-top">${metric("Codigo troquel", esc(state.form.troquel.dieCode || "No definido"))}${metric("Ancho montaje", `${num(state.form.troquel.widthIn, 3)} in`)}${metric("Largo montaje", `${num(state.form.troquel.lengthIn, 3)} in`)}${metric("Ancho material", `${num(state.form.troquel.materialWidthIn || 0, 3)} in`)}${metric("Elongacion", `${num(state.form.troquel.elongationPct || 0, 3)} %`)}${metric("Dientes", num(state.form.troquel.teeth, 0))}${metric("Repeticiones", num(state.form.troquel.repeats, 0))}${metric("Filas", num(state.form.troquel.rows, 0))}${metric("Etiquetas por vuelta", num(troquel.labelsPerRepeat, 0))}${metric("Desarrollo total", `${num(troquel.development, 3)} in`)}</div>${formula("Base del troquel", troquel.formulaText, troquel.explanation)}`));
  pushSection(card("sustrato", nextTitle("Sustrato"), material?.descripcion || "Selecciona material", sustrato.subtotal, `<div class="editable-grid substrate-grid"><label class="span-2"><span>Tipo de material</span><select data-scope="substrate" data-field="materialId">${processOptions((state.catalogs.materials || []).map((item) => ({ id: item.id, nombre: item.descripcion || item.nombre || item.id })), state.form.substrate.materialId)}</select></label><label><span>Costo por Pie</span><input data-scope="substrate" data-field="costPerFoot" type="number" step="0.000001" value="${esc(state.form.substrate.costPerFoot)}"></label></div><div class="readonly-grid compact-top">${metricBox("Etiquetas al Través", sustrato.acrossCount > 0 ? num(sustrato.acrossCount, 0) : "Pendiente", n(sustrato.acrossCount, 0) <= 0)}${metricBox("Desarrollo del Cilindro", sustrato.cylinderDevelopmentIn > 0 ? `${num(sustrato.cylinderDevelopmentIn, 3)} in` : "Pendiente", n(sustrato.cylinderDevelopmentIn, 0) <= 0)}${metricBox("Desperdicio de Arranque", sustrato.startupWasteFeet > 0 ? `${num(sustrato.startupWasteFeet, 2)} pies` : "Pendiente", (sustrato.issues || []).some((issue) => issue.includes("Desperdicio de Arranque")))}${metricBox("Longitud Total", sustrato.totalLengthFeet > 0 ? `${num(sustrato.totalLengthFeet, 2)} pies` : "Pendiente", (sustrato.issues || []).length > 0)}${metricBox("Área Total Consumida", sustrato.totalAreaFt2 > 0 ? `${num(sustrato.totalAreaFt2, 2)} pies²` : "Pendiente", n(sustrato.webWidthIn, 0) <= 0 || (sustrato.issues || []).length > 0)}${metric("Costo por Pie", money(sustrato.unitCost))}${metric("Subtotal", money(sustrato.subtotal))}</div>${issueList("Problemas detectados en la fórmula", sustrato.issues || [])}${formula("Longitud Total Requerida", sustrato.formulaConsumption, "Esta longitud usa la cantidad a producir, el desarrollo del cilindro, las etiquetas al través y luego suma la mácula o desperdicio de arranque.")}${formula("Área Total Consumida", sustrato.formulaArea, "El área consumida se calcula con la longitud total ya corregida por mácula y el ancho real de la bobina.")}${formula("Costo del Sustrato", sustrato.formulaCost, sustrato.explanation)}`));
  if (hasActiveProcess("diseno")) pushSection(card("diseno", nextTitle("Diseño"), "", design.subtotal, `<div class="editable-grid"><label><span>Cantidad de artes</span><input data-scope="design" data-field="artCount" type="number" step="1" value="${esc(state.form.design.artCount)}"></label><label><span>Tiempo por arte (h)</span><input data-scope="design" data-field="timePerArt" type="number" step="0.01" value="${esc(state.form.design.timePerArt)}"></label><label><span>Factor de cambios</span><input data-scope="design" data-field="changeFactor" type="number" step="0.01" value="${esc(state.form.design.changeFactor)}"></label><label><span>Costo hora disenador</span><input data-scope="design" data-field="hourCost" type="number" step="0.01" value="${esc(state.form.design.hourCost)}"></label><label><span>Tiempo total</span><input type="text" value="${esc(`${num(design.time, 2)} h`)}" readonly></label><label><span>Subtotal</span><input type="text" value="${esc(money(design.subtotal))}" readonly></label></div>${formula("Calculo de diseno", design.formulaText, design.explanation)}`));
  if (hasActiveProcess("preprensa")) pushSection(card("preprensa", nextTitle("Preprensa"), "", prepress.subtotal, `<div class="editable-grid"><label><span>Artes por hora</span><input data-scope="prepress" data-field="artsPerHour" type="number" step="0.01" value="${esc(state.form.prepress.artsPerHour)}"></label><label><span>Cantidad de artes</span><input data-scope="prepress" data-field="artCount" type="number" step="1" value="${esc(state.form.prepress.artCount)}"></label><label><span>Costo hora</span><input data-scope="prepress" data-field="hourCost" type="number" step="0.01" value="${esc(state.form.prepress.hourCost)}"></label></div><div class="readonly-grid compact-top">${metric("Tiempo", `${num(prepress.time, 2)} h`)}${metric("Subtotal", money(prepress.subtotal))}</div>${formula("Calculo de preprensa", prepress.formulaText, prepress.explanation)}`));
  if (hasActiveProcess("planchas")) pushSection(card("planchas", `${nextTitle("Planchas")}${digitalProcessNote ? ` <span style="color:#c62828;font-size:12px;font-weight:400;">${esc(digitalProcessNote)}</span>` : ""}`, "", plates.subtotal, `<div class="subprocess-stack">${PLATE_KEYS.map((entry) => renderPlateStep(entry, plates)).join("")}</div><div class="readonly-grid compact-top subtotal-right">${metric("Subtotal planchas", money(plates.subtotal))}</div>${formula("Total planchas", "Total planchas = grabado laser + revelado + limpieza + secado / curado", plates.explanation)}`));
  const printStageCards = hasActiveProcess("impresion")
    ? activePrintStages().map((item, index) => renderPrintStageCard(item, print.items[index] || {}, index, orderNumber++))
    : [];
  const externalFinishCards = (state.form.finishes || [])
    .map((finish, index) => {
      const config = EXTERNAL_FINISH_BY_KEY[finish.processKey];
      const finishItem = finishes.items[index];
      if (!config || !finishItem) return "";
      return renderExternalFinishCard(config, finishItem, index, orderNumber++);
    })
    .filter(Boolean);
  printStageCards.forEach(pushSection);
  externalFinishCards.forEach(pushSection);
  if (hasActiveProcess("empaque")) pushSection(card("empaque", nextTitle("Empaque"), "", packaging.subtotal, `<div class="editable-grid"><label><span>Cantidad rollos</span><input data-scope="packaging" data-field="rollCount" type="number" step="0.01" value="${esc(state.form.packaging.rollCount)}"></label><label><span>Rendimiento por hora</span><input data-scope="packaging" data-field="yieldPerHour" type="number" step="0.01" value="${esc(state.form.packaging.yieldPerHour)}"></label><label><span>Operarios</span><input data-scope="packaging" data-field="operators" type="number" step="1" value="${esc(state.form.packaging.operators)}"></label><label><span>Costo hora</span><input data-scope="packaging" data-field="hourCost" type="number" step="0.01" value="${esc(state.form.packaging.hourCost)}"></label><label><span>Costo externo</span><input data-scope="packaging" data-field="externalCost" type="number" step="0.01" value="${esc(state.form.packaging.externalCost)}"></label><label class="span-2"><span>Comentarios</span><input data-scope="packaging" data-field="comments" type="text" value="${esc(state.form.packaging.comments)}"></label><label class="span-2"><span>Adjunto</span><input data-scope="packaging" data-field="attachmentName" data-kind="file" type="file"></label></div><div class="readonly-grid compact-top">${metric("Tiempo", `${num(packaging.hours, 2)} h`)}${metric("Subtotal", money(packaging.subtotal))}</div>${formula("Calculo de empaque", packaging.formulaText, packaging.explanation)}`));
  if (hasActiveProcess("adicionales")) pushSection(card("adicionales", nextTitle("Procesos adicionales"), "", additional.subtotal, `<div class="table-toolbar"><button type="button" class="inline-button" data-action="add-additional">Agregar fila</button></div><div class="additional-table"><div class="additional-head"><span>Descripcion</span><span>Costo</span><span>Adjunto</span><span>Comentarios</span><span></span></div>${(state.form.additional.length ? state.form.additional : [{ description: "", cost: 0, attachmentName: "", comments: "" }]).map((item, index) => `<div class="additional-row"><input data-scope="additional.${index}" data-field="description" type="text" value="${esc(item.description || "")}"><input data-scope="additional.${index}" data-field="cost" type="number" step="0.01" value="${esc(item.cost || 0)}"><input data-scope="additional.${index}" data-field="attachmentName" data-kind="file" type="file"><input data-scope="additional.${index}" data-field="comments" type="text" value="${esc(item.comments || "")}"><button type="button" class="inline-button danger" data-action="remove-additional" data-index="${index}">Quitar</button></div>`).join("")}</div>${formula("Subtotal adicional", "Subtotal procesos adicionales = suma de costos manuales registrados", "Este bloque absorbe costos o gestiones que todavia no estan estandarizados en inventario.")}`));

  els.processSections.innerHTML = sections.join("");

  injectProcessRemoveButtons();
  updateProcessSurface();
  restoreOpenProcesses();
  renderSidebar(result);
  applyRequiredHighlights(result);
  restoreFocus(focusSnapshot);
}

function setNested(scope, field, value) {
  const parts = scope.split(".");
  let target = state.form;
  while (parts.length > 1) {
    const key = /^\d+$/.test(parts[0]) ? Number(parts[0]) : parts[0];
    target = target[key];
    parts.shift();
  }
  const last = /^\d+$/.test(parts[0]) ? Number(parts[0]) : parts[0];
  target[last][field] = value;
}

function applyDieDefaults(dieCode) {
  const die = findDie(dieCode);
  if (!die) return;
  const metricsValue = resolveDieMetrics(die, state.context || {});
  Object.assign(state.form.troquel, metricsValue);
  if (n(metricsValue.materialWidthIn, 0) > 0) {
    state.form.header.rollWidthIn = n(metricsValue.materialWidthIn, state.form.header.rollWidthIn);
  }
  state.form.plates.laser.area = laserPlateMetrics(state.form).totalArea;
}

function applyProcessDefaults(scope, processId) {
  const process = findProcess(processId);
  if (!process) return;
  if (scope.startsWith("finishes.")) {
    const index = Number(scope.split(".")[1]);
    const finish = state.form.finishes[index];
    const config = EXTERNAL_FINISH_BY_KEY[finish?.processKey] || {};
    const machine = findMachine(finish?.machineId) || selectSingleMachineOrNull(finishMachines(config));
    const machineCapacity = machine ? finishMachineCapacity(machine, config) : null;
    Object.assign(finish, {
      processId,
      description: process.nombre || finish.description,
      setupMinutes: firstPositiveNumber(process.tiempo_preparacion_general, machine?.setupBaseMinutes, machineCapacity?.tiempo_preparacion_general, finish.setupMinutes),
      speed: firstPositiveNumber(process.velocidad_produccion, machine?.productionSpeed, machineCapacity?.velocidad_produccion, finish.speed),
      costHour: firstPositiveNumber(process.costo_hora_maquina, process.costo_hora_operario, machine?.hourlyMachineCost, machine?.hourlyOperatorCost, machineCapacity?.costo_hora_maquina, machineCapacity?.costo_hora_operario, finish.costHour),
      fixedCost: n(process.costo_fijo, finish.fixedCost),
      variableUnitCost: n(process.costo_x_pie || process.costo_x_msi || process.costo_x_kg || process.costo_x_millar, finish.variableUnitCost)
    });
  }
}

function applyFinishMachineDefaults(scope, machineId) {
  if (!scope.startsWith("finishes.")) return;
  const index = Number(scope.split(".")[1]);
  if (!Number.isInteger(index) || !state.form.finishes[index]) return;
  const finish = state.form.finishes[index];
  const config = EXTERNAL_FINISH_BY_KEY[finish.processKey] || {};
  const machine = findMachine(machineId);
  if (!machine) return;
  const capacity = finishMachineCapacity(machine, config);
  const defaultMaterial = config.usesMaterial
    ? (materialsByClassification(config.materialFamily, config.materialKeywords || [])[0] || null)
    : null;
  const selectedMaterial = findMaterial(finish.materialId) || defaultMaterial;
  const costs = materialUnitCosts(selectedMaterial, state.form.header.rollWidthIn);
  Object.assign(finish, {
    machineId,
    machineName: machineDisplayName(machine) || finish.machineName,
    setupMinutes: firstPositiveNumber(machine.setupBaseMinutes, capacity?.tiempo_preparacion_general, finish.setupMinutes),
    speed: firstPositiveNumber(machine.productionSpeed, capacity?.velocidad_produccion, finish.speed),
    costHour: firstPositiveNumber(machine.hourlyMachineCost, capacity?.costo_hora_maquina, finish.costHour),
    costHourMachine: firstPositiveNumber(machine.hourlyMachineCost, capacity?.costo_hora_maquina, finish.costHourMachine),
    costHourOperator: firstPositiveNumber(machine.hourlyOperatorCost, capacity?.costo_hora_operario, finish.costHourOperator),
    materialId: config.usesMaterial && !finish.materialId ? (selectedMaterial?.id || "") : finish.materialId,
    costPerFoot: costs.costPerFoot,
    costPerMeter: costs.costPerMeter,
    costPerMsi: costs.costMsi,
    costPerFt2: n(first(selectedMaterial?.costo_x_ft2, selectedMaterial?.costoPorFt2), finish.costPerFt2),
    costPerUnit: n(selectedMaterial?.costo_x_unidad, finish.costPerUnit),
    costPerKg: n(selectedMaterial?.costo_x_kg, finish.costPerKg),
    layerGft2: n(first(selectedMaterial?.rendimiento_g_ft2, selectedMaterial?.peso_capa_gsm), finish.layerGft2)
  });
}

function applyPlateMachineDefaults(scope, machineId) {
  const machine = findMachine(machineId);
  if (!machine || !scope.startsWith("plates.")) return;
  const key = scope.split(".")[1];
  const entry = PLATE_KEYS.find((item) => item.key === key);
  if (!entry || !state.form.plates[key]) return;
  const capacity = plateMachineCapacity(machine, entry);
  const stock = key === "laser" ? (plateStockMaterials(machineId)[0] || null) : null;
  Object.assign(state.form.plates[key], {
    processId: machineId,
    machineName: machineDisplayName(machine) || state.form.plates[key].machineName,
    materialId: key === "laser" && !state.form.plates[key].materialId ? (stock?.id || "") : state.form.plates[key].materialId,
    speed: firstPositiveNumber(capacity?.velocidad_produccion, state.form.plates[key].speed),
    fixedMinutes: key === "laser" ? state.form.plates[key].fixedMinutes : firstPositiveNumber(capacity?.tiempo_preparacion_general, state.form.plates[key].fixedMinutes),
    costHourMachine: firstPositiveNumber(capacity?.costo_hora_maquina, state.form.plates[key].costHourMachine),
    costHourOperator: firstPositiveNumber(capacity?.costo_hora_operario, state.form.plates[key].costHourOperator)
  });
}

function applyPrintMachineDefaults(machineId) {
  const machine = findMachine(machineId);
  if (!machine) return;
  const capacity = primaryMachineCapacity(machine, (item) => {
    const haystack = capacityHaystack(machine, item);
    return haystack.includes("impresion") || haystack.includes("digital");
  }) || primaryMachineCapacity(machine);
  Object.assign(state.form.print, {
    machineId,
    machineName: machineDisplayName(machine) || state.form.print.machineName,
    setupMinutes: firstPositiveNumber(machine.setupBaseMinutes, capacity?.tiempo_preparacion_general, state.form.print.setupMinutes),
    mountingMinutes: firstPositiveNumber(machine.setupPerStationMinutes, capacity?.tiempo_por_estacion, 0) * Math.max(1, effectiveColors(state.form)),
    speedMetersMin: printSpeedValue(firstPositiveNumber(machine.productionSpeed, capacity?.velocidad_produccion, 0)) || state.form.print.speedMetersMin,
    costHour: firstPositiveNumber(machine.hourlyMachineCost, capacity?.costo_hora_maquina, state.form.print.costHour),
    operatorHourCost: firstPositiveNumber(machine.hourlyOperatorCost, capacity?.costo_hora_operario, state.form.print.operatorHourCost),
    availableColors: machineSupportsInline(machine) ? 8 : 4
  });
  if (Array.isArray(state.form.printStages) && state.form.printStages.length) {
    Object.assign(state.form.printStages[0], state.form.print);
  }
}

function applyPrintStageMachineDefaults(scope, machineId) {
  const machine = findMachine(machineId);
  if (!machine) return;
  const capacity = primaryMachineCapacity(machine, (item) => {
    const haystack = capacityHaystack(machine, item);
    return haystack.includes("impresion") || haystack.includes("digital");
  }) || primaryMachineCapacity(machine);
  const index = Number(scope.split(".")[1]);
  if (!Number.isInteger(index) || !state.form.printStages[index]) return;
  Object.assign(state.form.printStages[index], {
    machineId,
    machineName: machineDisplayName(machine) || state.form.printStages[index].machineName,
    setupMinutes: firstPositiveNumber(machine.setupBaseMinutes, capacity?.tiempo_preparacion_general, state.form.printStages[index].setupMinutes),
    mountingMinutes: firstPositiveNumber(machine.setupPerStationMinutes, capacity?.tiempo_por_estacion, 0) * Math.max(1, effectiveColors(state.form)),
    speedMetersMin: printSpeedValue(firstPositiveNumber(machine.productionSpeed, capacity?.velocidad_produccion, 0)) || state.form.printStages[index].speedMetersMin,
    costHour: firstPositiveNumber(machine.hourlyMachineCost, capacity?.costo_hora_maquina, state.form.printStages[index].costHour),
    operatorHourCost: firstPositiveNumber(machine.hourlyOperatorCost, capacity?.costo_hora_operario, state.form.printStages[index].operatorHourCost),
    availableColors: machineSupportsInline(machine) ? 8 : 4
  });
  if (index === 0) syncPrimaryPrintStage();
}

function bindHeader() {
  [["customerCode", els.customerCode, "text"], ["customerName", els.customerName, "text"], ["productType", els.productType, "text"], ["jobName", els.jobName, "text"], ["salespersonName", els.salespersonName, "text"], ["workType", els.workType, "text"], ["labelWidthIn", els.labelWidthIn, "number"], ["labelHeightIn", els.labelHeightIn, "number"], ["rollWidthIn", els.rollWidthIn, "number"], ["coreDiameter", els.coreDiameter, "text"], ["labelsPerRoll", els.labelsPerRoll, "number"], ["applicationType", els.applicationType, "text"], ["applicationEnvironment", els.applicationEnvironment, "text"], ["surfaceType", els.surfaceType, "text"], ["outputType", els.outputType, "text"], ["quantityTypes", els.quantityTypes, "number"], ["quantityChanges", els.quantityChanges, "number"], ["pantoneCount", els.pantoneCount, "number"]].forEach(([key, element, type]) => {
    const updateState = () => {
      state.form.header[key] = type === "number" ? n(element.value, 0) : element.value;
      if (key === "customerCode") syncCustomerCodeWidth();
      if (key === "outputType") outputPreview();
      if (key === "customerName") els.customerNameDisplay.textContent = state.form.header.customerName || "";
      if (key === "salespersonName") els.salespersonDisplay.textContent = state.form.header.salespersonName || "";
      applyRequiredHighlights();
      scheduleSave();
    };
    const rerender = () => {
      updateState();
      renderProcesses();
    };
    element.addEventListener("input", updateState);
    element.addEventListener("change", rerender);
  });
  [["useCmyk", els.useCmyk], ["useWhiteInk", els.useWhiteInk], ["doubleWhitePass", els.doubleWhitePass], ["noPrint", els.noPrint]].forEach(([key, element]) => {
    element.addEventListener("change", () => { state.form.header[key] = element.checked; renderProcesses(); scheduleSave(); });
  });
  [["overheadPct", els.overheadPct], ["marginPct", els.marginPct], ["taxPct", els.taxPct]].forEach(([key, element]) => {
    element.addEventListener("input", () => { state.form.commercial[key] = n(element.value, 0); scheduleSave(); });
    element.addEventListener("change", () => { state.form.commercial[key] = n(element.value, 0); renderProcesses(); scheduleSave(); });
  });
}

function bindFavoriteDocument() {
  els.favoriteDocumentButton?.addEventListener("click", () => {
    toggleFavoriteDocument();
  });
  els.refreshCostsButton?.addEventListener("click", () => {
    refreshCostsForCurrentLine();
  });
}

function bindTimelineLauncher() {
  if (!els.timelineLauncherButton || !els.timelineLauncherBridge || !els.timelineLauncherPanel) return;
  els.timelineLauncherButton.addEventListener("click", () => {
    const isHidden = els.timelineLauncherBridge.hasAttribute("hidden");
    els.processLauncherBridge?.setAttribute("hidden", "");
    els.processLauncherButton?.setAttribute("aria-expanded", "false");
    if (isHidden) els.timelineLauncherBridge.removeAttribute("hidden");
    else els.timelineLauncherBridge.setAttribute("hidden", "");
    els.timelineLauncherButton.setAttribute("aria-expanded", isHidden ? "true" : "false");
  });

  els.timelineLauncherPanel.addEventListener("click", (event) => {
    const reportButton = event.target.closest("#timelineReportButton");
    if (!reportButton) return;
    openTimelineReportDialog();
  });

  els.timelineReportClose?.addEventListener("click", () => els.timelineReportDialog?.close());
  els.timelineReportCancel?.addEventListener("click", () => els.timelineReportDialog?.close());
  els.timelineReportSubmit?.addEventListener("click", async () => {
    try {
      await submitTimelineNotification();
    } catch (error) {
      els.calcStatus.textContent = error.message || "No fue posible enviar la notificación.";
    }
  });
}

function bindQuantityRepeater() {
  els.quantityRepeater.addEventListener("input", (event) => {
    const input = event.target.closest("input[data-quantity-index]");
    if (!input) return;
    const index = Number(input.dataset.quantityIndex);
    state.form.header.quantities[index].value = Math.max(0, n(input.value, 0));
    input.value = state.form.header.quantities[index].value ? formatInteger(state.form.header.quantities[index].value) : "";
    state.form.header.quantity = currentQuantity(state.form);
    applyRequiredHighlights();
    scheduleSave();
  });
  els.quantityRepeater.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-quantity-index]");
    if (!input) return;
    const index = Number(input.dataset.quantityIndex);
    state.form.header.quantities[index].value = Math.max(0, n(input.value, 0));
    input.value = state.form.header.quantities[index].value ? formatInteger(state.form.header.quantities[index].value) : "";
    state.form.header.quantity = currentQuantity(state.form);
    renderProcesses();
    scheduleSave();
  });
  els.quantityRepeater.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "add-quantity") {
      if (state.form.header.quantities.length >= getQuantityCapacity()) return;
      state.form.header.quantities.push({ id: `qty-${state.form.header.quantities.length + 1}`, value: 0 });
      state.form.header.quantities = normalizeQuantities(state.form.header.quantities);
      state.form.header.quantity = currentQuantity(state.form);
      renderHeader();
      renderProcesses();
      els.quantityRepeater.querySelector(`input[data-quantity-index="${state.form.header.quantities.length - 1}"]`)?.focus();
      scheduleSave();
      return;
    }
    if (button.dataset.action === "remove-quantity") {
      if (state.form.header.quantities.length <= 1) return;
      state.form.header.quantities.pop();
      state.form.header.quantities = normalizeQuantities(state.form.header.quantities);
      state.form.header.quantity = currentQuantity(state.form);
      renderHeader();
      renderProcesses();
      scheduleSave();
    }
  });
}

function bindProcesses() {
  els.processSections.addEventListener("toggle", (event) => {
    const details = event.target.closest(".process-card");
    if (!details) return;
    const key = details.dataset.processKey || details.querySelector("summary strong")?.textContent?.trim();
    if (key) state.processOpen[key] = details.open;
  }, true);

  els.processSections.addEventListener("mouseleave", (event) => {
    const popover = event.target.closest(".info-popover");
    if (popover) popover.removeAttribute("open");
  }, true);

  const update = (event, shouldRender = false) => {
    const target = event.target;
    const scope = target.dataset.scope;
    const field = target.dataset.field;
    if (!scope || !field) return;
    if (scope.startsWith("additional.") && !state.form.additional[Number(scope.split(".")[1])]) state.form.additional[Number(scope.split(".")[1])] = { description: "", cost: 0, attachmentName: "", comments: "" };
    let value = target.dataset.kind === "file" ? (target.files?.[0]?.name || "") : target.type === "checkbox" ? target.checked : target.type === "number" ? n(target.value, 0) : target.value;
    if ((scope === "print" || scope.startsWith("printStages.")) && field === "speedMetersMin") {
      value = printSpeedValue(value);
    }
    setNested(scope, field, value);
    if (scope.startsWith("printStages.")) syncPrimaryPrintStage();
    if (scope.startsWith("printStages.") && scope.includes(".inlineFinishes.") && field === "active" && value) {
      const parts = scope.split(".");
      const stageIndex = Number(parts[1]);
      const inlineKey = parts[3];
      applyInlineFinishSetupDefaults(stageIndex, inlineKey);
      syncPrimaryPrintStage();
    }
    if (scope === "substrate" && field === "materialId") {
      const material = findMaterial(value);
      const costMsi = n(material?.costoMaterialPorMsi || material?.precioUnitarioCotizacionDol, 0);
      const costPerInch = r((costMsi * n(state.form.header.rollWidthIn, 0)) / 1000, 6);
      state.form.substrate.costPerFoot = r(costPerInch * 12, 6);
      state.form.substrate.costPerMeter = r(costPerInch / 0.0254, 6);
      state.form.substrate.costPerMsi = r(costMsi, 6);
    }
      if (scope.startsWith("finishes.") && field === "materialId") {
        const index = Number(scope.split(".")[1]);
        const material = findMaterial(value);
        const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
        Object.assign(state.form.finishes[index], {
          costPerFoot: costs.costPerFoot,
          costPerMeter: costs.costPerMeter,
          costPerMsi: costs.costMsi,
          costPerFt2: n(first(material?.costo_x_ft2, material?.costoPorFt2), 0),
          costPerUnit: n(material?.costo_x_unidad, 0),
          costPerKg: n(material?.costo_x_kg, 0),
          layerGft2: n(first(material?.rendimiento_g_ft2, material?.peso_capa_gsm), 0)
        });
      }
    if (scope.startsWith("printStages.") && scope.includes(".inlineFinishes.") && field === "materialId") {
      const parts = scope.split(".");
      const stageIndex = Number(parts[1]);
      const inlineKey = parts[3];
      const material = findMaterial(value);
      if (inlineKey === "barniz") {
        Object.assign(state.form.printStages[stageIndex].inlineFinishes[inlineKey], {
          costPerLb: materialCostPerPound(material),
          layerGsm: materialLayerGsm(material, 4)
        });
      } else {
        const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
        Object.assign(state.form.printStages[stageIndex].inlineFinishes[inlineKey], {
          costPerFoot: costs.costPerFoot,
          costPerMeter: costs.costPerMeter,
          costPerMsi: costs.costMsi
        });
      }
      syncPrimaryPrintStage();
    }
    if (scope === "troquel" && field === "dieCode") applyDieDefaults(value);
    if (scope === "print" && field === "machineId") applyPrintMachineDefaults(value);
    if (scope.startsWith("printStages.") && field === "machineId") applyPrintStageMachineDefaults(scope, value);
    if (scope.startsWith("plates.") && field === "processId") applyPlateMachineDefaults(scope, value);
    if (scope.startsWith("finishes.") && field === "machineId") applyFinishMachineDefaults(scope, value);
    if (!scope.startsWith("plates.") && field === "processId") applyProcessDefaults(scope, value);
    if (shouldRender) renderProcesses();
    else applyRequiredHighlights();
    scheduleSave();
  };
  els.processSections.addEventListener("input", (event) => update(event, false));
  els.processSections.addEventListener("change", (event) => update(event, true));
  els.processSections.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "remove-process") {
      event.preventDefault();
      event.stopPropagation();
      const cardNode = button.closest(".process-card");
      const processName = cardNode?.querySelector("summary strong")?.textContent?.trim() || "este proceso";
      if (!window.confirm(`¿Eliminar ${processName} de la línea de procesos?`)) return;
      if (button.dataset.removeType === "finish-instance") {
        const finishIndex = Number(button.dataset.removeIndex);
        const finish = state.form.finishes?.[finishIndex];
        if (Number.isInteger(finishIndex) && finish) {
          const processKey = finish.processKey;
          state.form.finishes.splice(finishIndex, 1);
          if (!state.form.finishes.some((item) => item.processKey === processKey)) removeProcessKey(processKey);
        }
      } else if (button.dataset.removeType === "print-stage") {
        const stageIndex = Number(button.dataset.removeIndex);
        if (Number.isInteger(stageIndex) && state.form.printStages?.[stageIndex]) {
          state.form.printStages.splice(stageIndex, 1);
          if (!state.form.printStages.length) {
            removeProcessKey("impresion");
          } else {
            syncPrimaryPrintStage();
          }
        }
      } else {
        removeProcessKey(button.dataset.removeIndex);
      }
      renderProcessLauncher();
      renderProcesses();
      scheduleSave();
      return;
    }
    if (button.dataset.action === "add-additional") state.form.additional.push({ description: "", cost: 0, attachmentName: "", comments: "" });
    if (button.dataset.action === "remove-additional") state.form.additional.splice(Number(button.dataset.index), 1);
    if (button.dataset.action === "remove-finish") {
      if ((state.form.finishes || []).length <= 1) return;
      state.form.finishes.splice(Number(button.dataset.index), 1);
    }
    renderProcesses();
    scheduleSave();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.processSections.addEventListener(eventName, (event) => {
      const key = state.draggingProcessKey || event.dataTransfer?.getData("text/process-key") || "";
      if (!key) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      els.processSections.classList.add("is-drop-target");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    els.processSections.addEventListener(eventName, () => {
      els.processSections.classList.remove("is-drop-target");
    });
  });
  els.processSections.addEventListener("drop", (event) => {
    const key = state.draggingProcessKey || event.dataTransfer?.getData("text/process-key") || "";
    if (!key) return;
    event.preventDefault();
    state.draggingProcessKey = "";
    if (addProcessKey(key)) {
      renderProcessLauncher();
      renderProcesses();
      scheduleSave();
    }
  });
}

function bindProcessLauncher() {
  els.processLauncherButton.addEventListener("click", () => {
    if (state.suppressLauncherClick) {
      state.suppressLauncherClick = false;
      return;
    }
    const isHidden = els.processLauncherBridge.hasAttribute("hidden");
    els.timelineLauncherBridge?.setAttribute("hidden", "");
    els.timelineLauncherButton?.setAttribute("aria-expanded", "false");
    if (isHidden) els.processLauncherBridge.removeAttribute("hidden");
    else els.processLauncherBridge.setAttribute("hidden", "");
    els.processLauncherButton.setAttribute("aria-expanded", isHidden ? "true" : "false");
  });

  els.processLauncherMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-process-key]");
    if (!button) return;
    const processKey = button.dataset.processKey;
    if (addProcessKey(processKey)) {
      renderProcessLauncher();
      renderProcesses();
      scheduleSave();
    }
    const card = processKey === "impresion"
      ? [...document.querySelectorAll(`.process-card[data-process-key^="impresion-"]`)].pop()
      : [...document.querySelectorAll(`.process-card[data-process-key="${processKey}"], .process-card[data-process-key^="${processKey}-"]`)].pop();
    if (card && !card.classList.contains("is-hidden-process")) {
      card.open = true;
      state.processOpen[card.dataset.processKey || processKey] = true;
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    els.processLauncherBridge.setAttribute("hidden", "");
    els.processLauncherButton.setAttribute("aria-expanded", "false");
  });

  els.processLauncherMenu.addEventListener("dragstart", (event) => {
    const button = event.target.closest("button[data-process-key]");
    if (!button || !event.dataTransfer) return;
    state.draggingProcessKey = button.dataset.processKey || "";
    event.dataTransfer.setData("text/process-key", state.draggingProcessKey);
    event.dataTransfer.effectAllowed = "copy";
  });

  els.processLauncherMenu.addEventListener("dragend", () => {
    state.draggingProcessKey = "";
    els.processSections.classList.remove("is-drop-target");
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".process-launcher-primary") || event.target.closest(".timeline-launcher-primary")) return;
    els.processLauncherBridge.setAttribute("hidden", "");
    els.processLauncherButton.setAttribute("aria-expanded", "false");
    els.timelineLauncherBridge?.setAttribute("hidden", "");
    els.timelineLauncherButton?.setAttribute("aria-expanded", "false");
  });

  els.processLauncherButton.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = els.processLauncherShell.getBoundingClientRect();
    state.launcherDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false
    };
    els.processLauncherButton.setPointerCapture(event.pointerId);
    els.processLauncherShell.classList.add("dragging");
  });

  els.processLauncherButton.addEventListener("pointermove", (event) => {
    if (!state.launcherDrag || state.launcherDrag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.launcherDrag.startX;
    const deltaY = event.clientY - state.launcherDrag.startY;
    if (!state.launcherDrag.moved && Math.abs(deltaX) + Math.abs(deltaY) > 6) state.launcherDrag.moved = true;
    if (!state.launcherDrag.moved) return;
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    const height = window.innerHeight || document.documentElement.clientHeight || 720;
    const shellWidth = els.processLauncherShell.offsetWidth || 80;
    const shellHeight = els.processLauncherShell.offsetHeight || 80;
    const left = Math.min(Math.max(8, state.launcherDrag.originX + deltaX), Math.max(8, width - shellWidth - 8));
    const top = Math.min(Math.max(8, state.launcherDrag.originY + deltaY), Math.max(8, height - shellHeight - 8));
    els.processLauncherShell.style.left = `${left}px`;
    els.processLauncherShell.style.top = `${top}px`;
    els.processLauncherShell.style.bottom = "auto";
    state.form.launcherPosition = { x: left, y: top };
    updateProcessLauncherMenuPlacement();
  });

  const finishDrag = (event) => {
    if (!state.launcherDrag || state.launcherDrag.pointerId !== event.pointerId) return;
    state.suppressLauncherClick = state.launcherDrag.moved;
    els.processLauncherShell.classList.remove("dragging");
    els.processLauncherButton.releasePointerCapture?.(event.pointerId);
    if (state.launcherDrag.moved && state.form.launcherPosition) {
      localStorage.setItem(PROCESS_LAUNCHER_STORAGE_KEY, JSON.stringify(state.form.launcherPosition));
      scheduleSave();
    }
    updateProcessLauncherMenuPlacement();
    state.launcherDrag = null;
  };

  els.processLauncherButton.addEventListener("pointerup", finishDrag);
  els.processLauncherButton.addEventListener("pointercancel", finishDrag);
}

async function init() {
  try {
    const quoteId = params.get("quoteId") || "";
    const lineId = params.get("lineId") || "";
    const [config, catalogs, context, costsConfig] = await Promise.all([
      getJson("/api/config/general"),
      getJson("/api/catalogs"),
      quoteId || lineId ? getJson(`/api/flexo/calculo?${new URLSearchParams({ quoteId, lineId }).toString()}`) : Promise.resolve(null),
      getJson("/api/costos-config").catch(() => null)
    ]);
    state.config = config;
    state.context = context;
    state.costsConfig = costsConfig;
    state.catalogs = { materials: catalogs.materials || [], troqueles: catalogs.troqueles || [], machines: catalogs.machines || [], machineCategories: catalogs.machineCategories || {}, processes: catalogs.processes || [], outputTypes: catalogs.outputTypes || [] };
    state.form = buildForm();
    await loadLineNotifications();
    els.pageTitle.textContent = "Cálculo de Flexografía";
    renderHeader();
    renderProcessLauncher();
    renderTimelineLauncher();
    renderProcesses();
    try {
      const storedPosition = JSON.parse(localStorage.getItem(PROCESS_LAUNCHER_STORAGE_KEY) || "null");
      const launcherPosition = storedPosition || state.form.launcherPosition;
      if (launcherPosition && els.processLauncherShell) {
        els.processLauncherShell.style.left = `${Math.max(8, n(launcherPosition.x, 20))}px`;
        els.processLauncherShell.style.top = `${Math.max(8, n(launcherPosition.y, 132))}px`;
        els.processLauncherShell.style.bottom = "auto";
      } else {
        applyDefaultLauncherPosition();
      }
      updateProcessLauncherMenuPlacement();
    } catch (error) {
      // Ignore persisted launcher position errors and fall back to CSS defaults.
    }
    bindHeader();
    bindFavoriteDocument();
    bindTimelineLauncher();
    bindQuantityRepeater();
    bindProcesses();
    bindProcessLauncher();
    window.addEventListener("resize", () => {
      renderQuantities();
      updateProcessLauncherMenuPlacement();
    });
  } catch (error) {
    els.calcStatus.textContent = error.message || "No fue posible cargar el calculo.";
  }
}

init();
