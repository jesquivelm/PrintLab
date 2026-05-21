const params = new URLSearchParams(window.location.search);

const DEFAULT_PRODUCT_TYPES = ["Etiquetas", "Cinta Continua", "Empaque Flexible", "Código de Barras", "Números de Carrera"];
const DEFAULT_APPLICATION_OPTIONS = ["Botella", "Caja", "Carton", "Envase", "Frasco", "Pouch", "Tapa", "Vidrio"];
const WORK_TYPES = ["Nuevo", "Repetición", "Repetición con Cambio", "Validación", "Muestra", "Regalía", "Proyecto"];
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
  { key: "virgin", label: "Plancha Virgen", machine: "Inventario", keywords: ["plancha", "cyrel", "cliche"], materialOnly: true },
  { key: "laser", label: "Grabado Láser", machine: "CDI Esko", keywords: ["grabado", "laser", "cdi"] },
  { key: "develop", label: "Revelado", machine: "Procesadora", keywords: ["revelado", "revel"] },
  { key: "clean", label: "Limpieza", machine: "Limpieza", keywords: ["limpieza"] },
  { key: "dry", label: "Secado / Curado", machine: "Secado / Curado", keywords: ["secado", "curado"] }
];
const PLATE_MODE_OPTIONS = [
  { key: "inventory", label: "Planchas en Inventario" },
  { key: "external", label: "Costo Externo" }
];
const PLATE_CREATE_MODE_OPTION = { key: "create", label: "Crear" };
const INLINE_PRINT_SLOTS = [
  { key: "barniz", label: "Barniz", keywords: ["barniz"], materialFamily: "barniz", materialKeywords: ["barniz"] },
  { key: "laminado", label: "Laminado", keywords: ["laminado"], materialFamily: "laminado", materialKeywords: ["laminado", "laminante", "overtape", "arclad", "graf depot"], usesMaterial: true },
  { key: "estampado", label: "Estampado", keywords: ["estampado", "foil"], materialFamily: "foil", materialKeywords: ["foil", "stamp", "estamp"], usesMaterial: true },
  { key: "embosado", label: "Embosado", keywords: ["embosado", "relieve", "emboss"], usesPlateCost: true },
  { key: "troquelado", label: "Troquelado", keywords: ["troquel"] },
  { key: "numerado", label: "Numerado", keywords: ["numerado", "numero"] }
];
const EXTERNAL_FINISH_SLOTS = [
  { key: "barnizado", label: "Barnizado", keywords: ["barnizado", "barniz"], materialFamily: "barniz", materialKeywords: ["barniz"], usesMaterial: true, usesWeightMaterial: true },
  { key: "laminado", label: "Laminado", keywords: ["laminado"], materialFamily: "laminado", materialKeywords: ["laminado", "laminante", "overtape", "arclad", "graf depot"], usesMaterial: true },
  { key: "estampado", label: "Estampado", keywords: ["estampado", "foil"], materialFamily: "foil", materialKeywords: ["foil", "stamp", "estamp"], usesMaterial: true },
  { key: "embosado", label: "Embosado", keywords: ["embosado", "relieve", "emboss"], usesPlateCost: true },
  { key: "troquelado", label: "Troquelado", keywords: ["troquel"] },
  { key: "rebobinado", label: "Rebobinado", keywords: ["rebob"] }
];
const EXTERNAL_FINISH_BY_KEY = Object.fromEntries(EXTERNAL_FINISH_SLOTS.map((item) => [item.key, item]));
const INLINE_PRINT_BY_KEY = Object.fromEntries(INLINE_PRINT_SLOTS.map((item) => [item.key, item]));
const INLINE_EXTERNAL_FINISH_KEY = {
  barniz: "barnizado",
  laminado: "laminado",
  estampado: "estampado",
  embosado: "embosado",
  troquelado: "troquelado"
};
const PROCESS_MENU = [
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
const INTERNAL_PROCESS_KEYS = new Set(["macula"]);
const PROCESS_CONFIG_FALLBACK = PROCESS_MENU.map((item) => ({
  key: item.key,
  label: item.label,
  active: true,
  createEnabled: !["troquel", "sustrato", "planchas", "troquelado", "adicionales"].includes(item.key),
  locked: Boolean(item.locked),
  repeatable: Boolean(item.repeatable),
  order: Number(item.order || 999),
  minimumCost: 0
}));
const PROCESS_LAUNCHER_STORAGE_KEY = "erp-flexo-process-launcher-position";
const FAVORITE_DOCUMENTS_STORAGE_KEY = "erp-favorite-documents";
const QUOTE_TRACKING_STORAGE_KEY = "erp-flexo-quote-tracking";

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
  labelWidthInDisplay: document.getElementById("labelWidthInDisplay"),
  labelHeightInDisplay: document.getElementById("labelHeightInDisplay"),
  rollWidthInDisplay: document.getElementById("rollWidthInDisplay"),
  coreDiameterDisplay: document.getElementById("coreDiameterDisplay"),
  labelsPerRoll: document.getElementById("labelsPerRoll"),
  labelsPerRollDisplay: document.getElementById("labelsPerRollDisplay"),
  applicationType: document.getElementById("applicationType"),
  applicationEnvironment: document.getElementById("applicationEnvironment"),
  applicationEnvironmentOptions: document.getElementById("applicationEnvironmentOptions"),
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
  processPickerButton: document.getElementById("processPickerButton"),
  processPickerPanel: document.getElementById("processPickerPanel"),
  processPickerMenu: document.getElementById("processPickerMenu"),
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
  printConfigCard: document.getElementById("printConfigCard"),
  quantityCard: document.getElementById("quantityCard"),
  frontBackElementsCard: document.getElementById("frontBackElementsCard"),
  frontBackElementsBody: document.getElementById("frontBackElementsBody"),
  processSections: document.getElementById("processSections"),
  calcStatus: document.getElementById("calcStatus"),
  detailsLineBadge: document.getElementById("detailsLineBadge"),
  quoteTrackingMount: document.getElementById("quoteTrackingMount"),
  detailsCostTable: document.getElementById("detailsCostTable"),
  detailsProformaButton: document.getElementById("detailsProformaButton"),
  contextRows: document.getElementById("contextRows"),
  automaticSummaryRows: document.getElementById("automaticSummaryRows"),
  overheadPct: document.getElementById("overheadPct"),
  marginPct: document.getElementById("marginPct"),
  discountPct: document.getElementById("discountPct"),
  taxPct: document.getElementById("taxPct"),
  viewProformaButton: document.getElementById("viewProformaButton"),
  summaryRows: document.getElementById("summaryRows"),
  sapPreviewSummary: document.getElementById("sapPreviewSummary"),
  sapPreviewShipments: document.getElementById("sapPreviewShipments"),
  sapPreviewOrder: document.getElementById("sapPreviewOrder"),
  sapPreviewBom: document.getElementById("sapPreviewBom"),
  sapPreviewSendButton: document.getElementById("sapPreviewSendButton"),
  sapPreviewOpenOutputButton: document.getElementById("sapPreviewOpenOutputButton")
};

const state = {
  config: null,
  sapConfig: null,
  sapSalespersonConfigs: [],
  sapProductionCostCenter: null,
  context: null,
  costsConfig: null,
  catalogs: { materials: [], troqueles: [], machines: [], machineCategories: {}, processes: [] },
  form: null,
  notifications: [],
  saveTimer: null,
  saving: false,
  processOpen: {},
  detailsOpen: { sustrato: false },
  quoteTracking: { id: "", panelOpen: false, formOpenKey: "", milestones: [], closure: null },
  trackingUserPhotos: new Map(),
  frontBackActiveElementLineCode: "",
  infoPopover: {
    trigger: null,
    panel: null,
    title: null,
    body: null,
    close: null
  },
  draggingProcessKey: "",
  launcherDrag: null,
  suppressLauncherClick: false,
  processPickerOpen: false
};

function findSapSalespersonConfigByName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return null;
  return (state.sapSalespersonConfigs || []).find((item) => String(item?.salespersonName || "").trim().toLowerCase() === normalized) || null;
}

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
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
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
  return String(key || "").split(/[.\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

function isBrokenIconValue(value) {
  const text = String(value || "").trim();
  return !text || text === "??" || /\uFFFD/.test(text);
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

function iconPresentationAny(keys, fallbackValue, fallbackColor, fallbackSize) {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    const presentation = iconPresentation(key, fallbackValue, fallbackColor, fallbackSize);
    if (!isBrokenIconValue(presentation.value) && presentation.value !== fallbackValue) return presentation;
  }
  const base = iconPresentation(keyList[0], fallbackValue, fallbackColor, fallbackSize);
  return { ...base, value: isBrokenIconValue(base.value) ? fallbackValue : base.value };
}

function normalizePlateMode(value) {
  const key = String(value || "").trim().toLowerCase();
  return plateModeOptions().some((item) => item.key === key) ? key : "";
}

function plateModeOptions() {
  return processCreateEnabled("planchas") ? [PLATE_CREATE_MODE_OPTION, ...PLATE_MODE_OPTIONS] : PLATE_MODE_OPTIONS;
}

function emptyPlateBreakdown(reason = "Costo = 0.") {
  const breakdown = {};
  PLATE_KEYS.forEach((entry) => {
    breakdown[entry.key] = {
      hours: 0,
      materialSubtotal: 0,
      machineSubtotal: 0,
      operatorSubtotal: 0,
      subtotal: 0,
      formulaText: "Costo = 0.",
      explanation: reason,
      laserMetrics: ["virgin", "laser"].includes(entry.key) ? laserPlateMetrics() : null
    };
  });
  return breakdown;
}

function normalizePlateExternalRows(rows = []) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
    description: String(row?.description || "").trim(),
    cost: n(row?.cost, 0),
    comments: String(row?.comments || "").trim(),
    attachmentName: String(row?.attachmentName || "").trim()
  }));
  return normalized.length ? normalized : [{ description: "", cost: 0, comments: "", attachmentName: "" }];
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
  const currentUser = currentTrackingUser();
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

function quoteTrackingStorageId() {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  return quoteCode || lineCode ? `${quoteCode || "cotizacion"}::${lineCode || "linea"}` : "sin-base";
}

function readQuoteTrackingStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUOTE_TRACKING_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeQuoteTrackingStore(items) {
  localStorage.setItem(QUOTE_TRACKING_STORAGE_KEY, JSON.stringify(items || {}));
}

function currentTrackingUser() {
  const session = readUserSession();
  return first(session?.name, session?.fullName, session?.username, session?.user, state.config?.session?.currentUser, state.config?.general?.currentUser, state.form?.header?.salespersonName, "Usuario");
}

function trackingUserLookupKey(value) {
  return norm(value).replace(/\s+/g, " ");
}

function registerTrackingUserPhoto(map, value, photoUrl) {
  const key = trackingUserLookupKey(value);
  const photo = String(photoUrl || "").trim();
  if (key && photo && !map.has(key)) map.set(key, photo);
}

function buildTrackingUserPhotoMap(users = []) {
  const map = new Map();
  const session = readUserSession() || {};
  const sessionPhoto = first(session.photoUrl, session.photo_url);
  [session.name, session.fullName, session.username, session.user].forEach((value) => registerTrackingUserPhoto(map, value, sessionPhoto));
  (Array.isArray(users) ? users : []).forEach((user) => {
    const photo = first(user?.photoUrl, user?.photo_url);
    [user?.name, user?.fullName, user?.full_name, user?.username, user?.sapSalespersonName, user?.sap_salesperson_name].forEach((value) => registerTrackingUserPhoto(map, value, photo));
  });
  return map;
}

function trackingPhotoForName(name) {
  return state.trackingUserPhotos?.get(trackingUserLookupKey(name)) || "";
}

function trackingAvatarContent(name) {
  const photo = trackingPhotoForName(name);
  const initials = initialsFromName(name);
  if (!photo) return esc(initials);
  return `<img class="tracking-avatar-image" src="${esc(photo)}" alt="${esc(name || "Usuario")}" data-tracking-avatar-img><span class="tracking-avatar-fallback" hidden>${esc(initials)}</span>`;
}

function bindTrackingAvatarFallback(root) {
  root?.querySelectorAll("[data-tracking-avatar-img]").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      const fallback = image.nextElementSibling;
      if (fallback) fallback.hidden = false;
    }, { once: true });
  });
}

function trackingColorForName(name) {
  const palette = ["#2B7FC7", "#1A9E75", "#7C5CBF", "#C0761F", "#4B6F8F"];
  const text = String(name || "");
  const total = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

function trackingStampNow() {
  const d = new Date();
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function quoteCreationTrackingDate() {
  const context = state.context?.calculo || {};
  const quote = state.context?.cotizacion || {};
  const raw = context?.raw_data || {};
  const value = first(quote?.created_on, context?.created_on, raw["FECHA CREACION DATE"], raw["FECHA CREACION"], raw["TRAZABILIDAD | FECHA"]);
  return value ? formatTimelineStamp(value) : "Pendiente";
}

function isDuplicatedDraftTracking() {
  const raw = state.context?.calculo?.raw_data || {};
  const quoteStatus = String(state.form?.header?.lineStatus || "").trim().toLowerCase();
  const quoteDone = ["cotizada", "finalizada", "proforma", "enviada", "cerrada", "produccion", "producción"].some((item) => quoteStatus.includes(item));
  return raw["TRAZABILIDAD | ACCION"] === "duplicate-line" && !quoteDone;
}

const QUOTE_CLOSE_REASON_OPTIONS = [
  "Precio alto",
  "Tiempo de entrega",
  "Cliente eligió otro proveedor",
  "Condiciones comerciales",
  "Cambios en especificación",
  "Proyecto cancelado",
  "Sin respuesta del cliente",
  "Otro"
];

function quoteTrackingDefaults() {
  const currentUser = currentTrackingUser();
  const sellerName = first(state.form?.header?.salespersonName, "Vendedor");
  const raw = state.context?.calculo?.raw_data || {};
  const quoteStatus = String(state.form?.header?.lineStatus || "").trim().toLowerCase();
  const quoteDone = ["cotizada", "finalizada", "proforma", "enviada", "cerrada", "produccion", "producción"].some((item) => quoteStatus.includes(item));
  const requestStatus = norm(first(raw["SOLICITUD ESTADO"], raw["ESTADO LINEA"], state.form?.header?.lineStatus, raw["Estado Cotizacion"]));
  const requestDone = ["pendiente", "solicitud", "vendedor", "cotiz", "finaliz", "proforma", "enviad", "cerrad"].some((item) => requestStatus.includes(item))
    || norm(raw["TRAZABILIDAD | SOLICITUD VENDEDOR"]) === "si";
  const requestUser = requestDone ? first(raw["TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR"], sellerName) : null;
  const requestDate = requestDone ? first(raw["TRAZABILIDAD | FECHA SOLICITUD VENDEDOR"], raw["TRAZABILIDAD | FECHA"], quoteCreationTrackingDate()) : null;
  return [
    { key: "creacion", label: "Creación", icon: "ti-file-plus", user: sellerName, initials: initialsFromName(sellerName), color: trackingColorForName(sellerName), date: quoteCreationTrackingDate(), done: true, fixed: true, canCR: false, cr: null, formOpen: false },
    { key: "solicitud", label: "Solicitud del vendedor", icon: "ti-send", user: requestUser, initials: initialsFromName(requestUser || sellerName), color: trackingColorForName(requestUser || sellerName), date: requestDate, done: requestDone, fixed: false, canCR: true, cr: null, formOpen: false, crLabel: "Solicitar cambios al vendedor", crWho: "Cotizador", crPH: "¿Qué información falta o cuál es la duda con la solicitud?" },
    { key: "finalizacion", label: "Finalización de cotización", icon: "ti-list-check", user: quoteDone ? currentUser : null, initials: initialsFromName(currentUser), color: trackingColorForName(currentUser), date: quoteDone ? trackingStampNow() : null, done: quoteDone, fixed: false, canCR: true, cr: null, formOpen: false, crLabel: "Requerir cambios en la cotización", crWho: "Vendedor", crPH: "¿Qué necesita ajustarse antes de continuar?" },
    { key: "envio", label: "Envío de proforma", icon: "ti-file-invoice", hint: "Requiere finalizar cotización primero", done: false, fixed: false, canCR: false, cr: null, formOpen: false, user: null, initials: initialsFromName(currentUser), color: trackingColorForName(currentUser) },
    { key: "cierre", label: "Finalización comercial", icon: "ti-flag", hint: "Requiere enviar proforma primero", done: false, fixed: false, canCR: false, cr: null, formOpen: false, user: null, initials: initialsFromName(currentUser), color: trackingColorForName(currentUser) }
  ];
}

function loadQuoteTrackingMilestones() {
  const store = readQuoteTrackingStore();
  const id = quoteTrackingStorageId();
  const storedState = store[id] || {};
  state.quoteTracking.closure = storedState.closure || state.context?.calculo?.raw_data?.Cierre_Cotizacion || state.form?.quoteTrackingClosure || null;
  const saved = Array.isArray(storedState.milestones) ? storedState.milestones : [];
  const defaults = quoteTrackingDefaults();
  const milestones = defaults.map((item) => {
    const stored = saved.find((entry) => entry?.key === item.key);
    return stored ? { ...item, ...stored, label: item.label, icon: item.icon, hint: item.hint, formOpen: false } : item;
  });
  const creation = milestones.find((item) => item.key === "creacion");
  if (creation && !String(creation.date || "").trim()) creation.date = quoteCreationTrackingDate();
  const request = milestones.find((item) => item.key === "solicitud");
  if (request && request.done && !String(request.date || "").trim()) {
    request.done = false;
    request.user = null;
    request.date = null;
    request.cr = null;
    request.formOpen = false;
  }
  if (isDuplicatedDraftTracking() && !storedState.duplicateTrackingResetAt) {
    milestones.forEach((item, index) => {
      if (index === 0) return;
      item.done = false;
      item.user = null;
      item.date = null;
      item.cr = null;
      item.formOpen = false;
    });
    store[id] = {
      ...storedState,
      duplicateTrackingResetAt: Date.now(),
      updatedAt: Date.now(),
      milestones: milestones.map((item) => ({ ...item, formOpen: false }))
    };
    writeQuoteTrackingStore(store);
  }
  return milestones;
}

function saveQuoteTrackingMilestones() {
  const id = quoteTrackingStorageId();
  const store = readQuoteTrackingStore();
  const storedState = store[id] || {};
  store[id] = {
    ...storedState,
    updatedAt: Date.now(),
    closure: state.quoteTracking.closure || null,
    milestones: (state.quoteTracking.milestones || []).map((item) => ({ ...item, formOpen: false }))
  };
  writeQuoteTrackingStore(store);
}

function quoteTrackingDoneCount() {
  return (state.quoteTracking.milestones || []).filter((item) => item.done).length;
}

function quoteTrackingAvailable(index) {
  return index === 0 || Boolean(state.quoteTracking.milestones?.[index - 1]?.done);
}

function syncLineStatusFromTracking() {
  if (!state.form?.header) return;
  const milestones = state.quoteTracking.milestones || [];
  const done = quoteTrackingDoneCount();
  const labels = ["En proceso", "En proceso", "En proceso", "Cotización finalizada", "Proforma enviada", "Cerrada"];
  state.form.header.lineStatus = labels[Math.min(done, labels.length - 1)] || "En proceso";
  if (milestones.find((item) => item.key === "cierre")?.done) state.form.header.lineStatus = "Cerrada";
}

function markQuoteTrackingItemDone(item) {
  if (!item) return;
  const user = currentTrackingUser();
  item.done = true;
  item.user = user;
  item.initials = initialsFromName(user);
  item.color = trackingColorForName(user);
  item.date = trackingStampNow();
  item.cr = null;
  item.formOpen = false;
}

function currentQuoteLineIdentity() {
  return {
    quoteCode: String(state.form?.header?.quoteCode || "").trim(),
    lineCode: String(state.form?.header?.lineCode || "").trim()
  };
}

function refreshNotificationBadges() {
  if (window.parent === window) return;
  window.parent.postMessage({ type: "erp-notifications-updated" }, window.location.origin);
}

function trackingRecipientForEvent(item = {}, eventType = "") {
  const sellerName = state.form?.header?.salespersonName || "Vendedor";
  if (eventType === "reversion") return item.user || (item.key === "finalizacion" ? "Cotizador" : sellerName);
  if (item.key === "finalizacion" || item.key === "envio" || item.key === "cierre") return sellerName;
  return item.crWho === "Vendedor" ? sellerName : "Cotizador";
}

function trackingMessageForEvent(item = {}, eventType = "", detail = "") {
  const label = item.label || "Seguimiento";
  if (eventType === "reversion") return `Se revirtió la marca "${label}". ${detail || "Revisión pendiente."}`.trim();
  if (eventType === "solicitud-cambios") return detail || `Se solicitaron cambios en "${label}".`;
  if (eventType === "orden-produccion") return detail || "La venta fue aceptada y se creó la orden de producción.";
  if (eventType === "cierre-descartado") return `La cotización fue cerrada sin venta. ${detail || ""}`.trim();
  if (item.key === "finalizacion") return "La línea de cálculo fue marcada como Finalización de cotización.";
  if (item.key === "envio") return "La proforma fue marcada como enviada.";
  if (item.key === "cierre") return "La cotización fue marcada como cerrada.";
  return `Se actualizó el seguimiento: ${label}.`;
}

async function notifyQuoteTrackingEvent(item = {}, eventType = "", detail = "") {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  if (!quoteCode || !lineCode) return null;
  const payload = {
    quoteCode,
    lineCode,
    sellerName: state.form?.header?.salespersonName || "Vendedor",
    customerName: state.form?.header?.customerName || "",
    jobName: state.form?.header?.jobName || "",
    issueText: trackingMessageForEvent(item, eventType, detail),
    targetUser: trackingRecipientForEvent(item, eventType),
    actor: currentTrackingUser(),
    eventType,
    snapshot: {
      quoteCode,
      lineCode,
      customerName: state.form?.header?.customerName || "",
      salespersonName: state.form?.header?.salespersonName || "",
      jobName: state.form?.header?.jobName || "",
      lineStatus: state.form?.header?.lineStatus || "",
      trackingStep: item.label || "",
      trackingKey: item.key || "",
      eventType
    }
  };
  const response = await postJson("/api/flexo/notificaciones", payload);
  await loadLineNotifications();
  refreshNotificationBadges();
  return response;
}

async function completeQuoteTrackingMilestone(index) {
  const item = state.quoteTracking.milestones?.[index];
  if (!item || !quoteTrackingAvailable(index)) return;
  if (["envio", "cierre"].includes(item.key) && await showQuoteProformaBlockMessageIfNeeded()) return;
  if (item.key === "envio") {
    await closeProformaForCurrentQuote("tracking_sent");
  }
  markQuoteTrackingItemDone(item);
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  saveQuoteTrackingMilestones();
  renderDetailsDemo(totals());
  scheduleSave();
  if (["finalizacion", "envio", "cierre"].includes(item.key)) {
    notifyQuoteTrackingEvent({ ...item }, "marca").catch(() => showCenterMessage("No fue posible enviar la notificación."));
  }
}

function undoQuoteTrackingMilestone(index) {
  const reverted = (state.quoteTracking.milestones || [])
    .slice(index)
    .filter((item) => item?.done && !item.fixed)
    .map((item) => ({ ...item }));
  for (let i = state.quoteTracking.milestones.length - 1; i >= index; i -= 1) {
    const item = state.quoteTracking.milestones[i];
    if (item?.fixed) continue;
    item.done = false;
    item.user = null;
    item.date = null;
    item.formOpen = false;
  }
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  saveQuoteTrackingMilestones();
  renderDetailsDemo(totals());
  scheduleSave();
  reverted.forEach((item) => {
    notifyQuoteTrackingEvent(item, "reversion").catch(() => showCenterMessage("No fue posible enviar la notificación."));
  });
  if (reverted.some((item) => item.key === "envio")) {
    reopenProformaForCurrentQuote().catch(() => showCenterMessage("No fue posible reabrir la proforma."));
  }
}

function openQuoteTrackingForm(index) {
  const item = state.quoteTracking.milestones?.[index];
  state.quoteTracking.formOpenKey = item?.key || "";
  renderQuoteTracking();
  setTimeout(() => document.getElementById(`quoteTrackingText-${index}`)?.focus(), 50);
}

function closeQuoteTrackingForm() {
  state.quoteTracking.formOpenKey = "";
  renderQuoteTracking();
}

async function submitQuoteTrackingChange(index) {
  const item = state.quoteTracking.milestones?.[index];
  const textarea = document.getElementById(`quoteTrackingText-${index}`);
  const value = String(textarea?.value || "").trim();
  if (!item || !value) {
    textarea?.classList.add("error");
    textarea?.focus();
    return;
  }
  item.cr = { comment: value, by: `${currentTrackingUser()} (${item.crWho})`, date: trackingStampNow() };
  item.done = false;
  item.user = null;
  item.date = null;
  item.formOpen = false;
  for (let i = index + 1; i < state.quoteTracking.milestones.length; i += 1) {
    if (!state.quoteTracking.milestones[i]?.fixed) {
      state.quoteTracking.milestones[i].done = false;
      state.quoteTracking.milestones[i].user = null;
      state.quoteTracking.milestones[i].date = null;
    }
  }
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  saveQuoteTrackingMilestones();
  const quoteCode = state.form?.header?.quoteCode || "";
  const lineCode = state.form?.header?.lineCode || "";
  if (quoteCode && lineCode) {
    await notifyQuoteTrackingEvent(item, "solicitud-cambios", value);
  }
  renderDetailsDemo(totals());
  scheduleSave();
}

function quoteClosureFormMarkup(index) {
  return `<div class="tracking-close-form tracking-close-form-dialog"><div class="tracking-close-dialog-head"><strong>Dar motivo de cierre</strong><span>Registra el motivo sin mover el panel de seguimiento.</span></div><label><span>Motivo</span><select id="quoteTrackingCloseReason" data-tracking-close-input><option value="">Selecciona un motivo</option>${QUOTE_CLOSE_REASON_OPTIONS.map((reason) => `<option value="${esc(reason)}">${esc(reason)}</option>`).join("")}</select></label><label><span>Comentario</span><textarea id="quoteTrackingCloseComments" class="cr-textarea" placeholder="Comentario para gerencia" data-tracking-close-input></textarea></label><div class="tracking-close-actions"><button type="button" class="btn-cancel" data-close-calc-message>Cancelar</button><button type="button" class="btn-submit" data-tracking-submit-close="${index}"><i class="ti ti-send" style="font-size:12px;" aria-hidden="true"></i>Guardar cierre</button></div></div>`;
}

function openQuoteClosureForm(index) {
  state.quoteTracking.formOpenKey = "";
  showCenterMessage(quoteClosureFormMarkup(index), { html: true, duration: 0, className: "tracking-close-dialog" });
  setTimeout(() => document.getElementById("quoteTrackingCloseReason")?.focus(), 50);
}

async function submitQuoteClosureReason(index) {
  const item = state.quoteTracking.milestones?.[index];
  const reasonField = document.getElementById("quoteTrackingCloseReason");
  const commentsField = document.getElementById("quoteTrackingCloseComments");
  const reason = String(reasonField?.value || "").trim();
  const comments = String(commentsField?.value || "").trim();
  if (!item || !reason) {
    reasonField?.classList.add("error");
    reasonField?.focus();
    return false;
  }
  if (await showQuoteProformaBlockMessageIfNeeded()) return false;
  state.quoteTracking.closure = {
    outcome: "lost",
    reason,
    comments,
    by: currentTrackingUser(),
    date: trackingStampNow()
  };
  markQuoteTrackingItemDone(item);
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  saveQuoteTrackingMilestones();
  await persistTrackingClosure();
  await notifyQuoteTrackingEvent(item, "cierre-descartado", `${reason}${comments ? ` · ${comments}` : ""}`);
  renderDetailsDemo(totals());
  scheduleSave();
  return true;
}

async function persistCalculationForOrder() {
  const payload = {
    ...buildSavePayload(),
    finalizedForOrder: true,
    trackingClosure: state.quoteTracking.closure || null
  };
  const saved = await postJson("/api/flexo/calculo/guardar", payload);
  if (state.context?.calculo?.raw_data) state.context.calculo.raw_data.Finalizado_Para_Orden = true;
  return saved;
}

async function persistTrackingClosure() {
  await postJson("/api/flexo/calculo/guardar", {
    ...buildSavePayload(),
    trackingClosure: state.quoteTracking.closure || null
  });
}

async function stageSapOutputForCurrentLine() {
  const { quoteCode, lineCode } = currentQuoteLineIdentity();
  if (!quoteCode || !lineCode) throw new Error("Debes tener una cotización y una línea activas para preparar SAP.");
  return postJson(`/api/flexo/sap-export/${encodeURIComponent(quoteCode)}/${encodeURIComponent(lineCode)}`, {});
}

async function createProductionOrderFromTracking(index) {
  ensureCalculationReadyForOutput();
  const item = state.quoteTracking.milestones?.[index];
  const { quoteCode, lineCode } = currentQuoteLineIdentity();
  if (!item || !quoteCode || !lineCode) throw new Error("Debes tener una cotización y una línea activas para crear la orden.");
  if (await showQuoteProformaBlockMessageIfNeeded()) return;
  const firstSave = await persistCalculationForOrder();
  let sapPrepared = Boolean(firstSave?.sapExport && !firstSave.sapExport.error);
  let sapError = firstSave?.sapExport?.error || "";
  if (!sapPrepared && !sapError) {
    try {
      await stageSapOutputForCurrentLine();
      sapPrepared = true;
    } catch (error) {
    sapError = error.message || "No fue posible preparar la salida SAP.";
    console.warn("Preparación SAP no bloqueante:", error);
  }
}

  // Quantity selection when multiple tiers exist
  var body = {};
  try {
    var header = state.context?.calculo?.raw_data?.['Estado_UI']?.header || {};
    var rawQty = Array.isArray(header.quantities) ? header.quantities : [];
    var quantities = rawQty.filter(function (q) { return q && Number(q.quantity) > 0; });
    if (quantities.length > 1) {
      var qText = quantities.map(function (q, i) {
        return (i + 1) + '. ' + n(q.quantity, 0) + ' uds' + (q.unitPrice ? ' @ ' + q.unitPrice : '');
      }).join('\n');
      var choice = window.prompt('Selecciona la cantidad para la orden:\n' + qText + '\n\nIngresa el número de la opción (1-' + quantities.length + ') o Enter para usar la actual:', '1');
      var idx = parseInt(choice, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= quantities.length) {
        body.quantity = Number(quantities[idx - 1].quantity);
      }
    }
  } catch (e) {}

  const payload = await postJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/orden-produccion`, body);
  const orderCode = payload?.orden?.order_code || "";
  state.quoteTracking.closure = {
    outcome: "accepted",
    reason: "Orden creada",
    comments: "",
    by: currentTrackingUser(),
    date: trackingStampNow(),
    orderCode,
    sapPrepared,
    sapError
  };
  markQuoteTrackingItemDone(item);
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  saveQuoteTrackingMilestones();
  await persistCalculationForOrder();
  await notifyQuoteTrackingEvent(item, "orden-produccion", orderCode ? `Orden de producción ${orderCode} creada.` : "Orden de producción creada.");
  renderDetailsDemo(totals());
  scheduleSave();
  if (orderCode) {
    const route = `/orden-produccion/${encodeURIComponent(orderCode)}`;
    if (!openRouteInShell(route, `Orden ${orderCode}`)) window.location.href = route;
  }
}

async function createProductFromCurrentLine() {
  const { quoteCode, lineCode } = currentQuoteLineIdentity();
  if (!quoteCode || !lineCode) throw new Error("Debes tener una cotización y una línea activas para crear el producto.");
  const payload = await postJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/producto`, {});
  const productCode = payload?.producto?.product_code || "";
  if (productCode && state.context?.calculo) {
    state.context.calculo.productCode = productCode;
    state.context.calculo.product_code = productCode;
    if (state.context.calculo.raw_data) {
      state.context.calculo.raw_data["CODIGO PRODUCTO"] = productCode;
      if (state.context.calculo.raw_data.line_summary) state.context.calculo.raw_data.line_summary.product_code = productCode;
    }
  }
  els.calcStatus.textContent = productCode ? `Producto ${productCode} creado.` : "Producto creado.";
  const route = "/productos";
  if (!openRouteInShell(route, "Productos")) window.location.href = route;
}

function isShellEmbedded() {
  return params.get("shell") === "1" || window !== window.parent;
}

function withShellParam(route) {
  try {
    const url = new URL(route, window.location.origin);
    url.searchParams.set("shell", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    return route.includes("?") ? `${route}&shell=1` : `${route}?shell=1`;
  }
}

function openRouteInShell(route, label) {
  if (!isShellEmbedded()) return false;
  window.parent.postMessage({ type: "erp-open-tab", route: withShellParam(route), label }, window.location.origin);
  return true;
}

function openAppRoute(route, label) {
  if (!route) return;
  if (!openRouteInShell(route, label)) {
    window.location.href = withShellParam(route);
  }
}

function buildLineCalculationRoute({ lineCode, quoteCode, productId = "", department = "Flexografia", processKey = "" } = {}) {
  if (!lineCode || !quoteCode) return "";
  const query = {
    lineId: lineCode,
    quoteId: quoteCode,
    productId,
    department
  };
  if (processKey) query.jumpProcess = processKey;
  return `/calculo-flexografia?${new URLSearchParams(query).toString()}`;
}

function showCenterMessage(message, options = {}) {
  const text = String(message || "").trim();
  if (!text) return;
  let node = document.getElementById("calcCenterMessage");
  if (!node) {
    node = document.createElement("div");
    node.id = "calcCenterMessage";
    node.className = "calc-center-message";
    document.body.appendChild(node);
  }
  node.className = `calc-center-message${options.className ? ` ${options.className}` : ""}`;
  const closeButton = '<button type="button" class="calc-center-message-close" data-close-calc-message aria-label="Cerrar">&times;</button>';
  if (options.html) node.innerHTML = `${closeButton}<div class="calc-center-message-content">${text}</div>`;
  else node.innerHTML = `${closeButton}<div class="calc-center-message-content">${esc(text)}</div>`;
  node.hidden = false;
  clearTimeout(showCenterMessage.timer);
  if (options.duration !== 0) {
    showCenterMessage.timer = setTimeout(() => { node.hidden = true; }, options.duration || 5200);
  }
}

function setTrackingButtonLoading(button, label = "Procesando...") {
  if (!button) return () => {};
  const originalHtml = button.innerHTML;
  const originalDisabled = button.disabled;
  const width = button.getBoundingClientRect?.().width || 0;
  button.dataset.loading = "true";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.classList.add("is-tracking-loading");
  if (width > 0 && !button.classList.contains("tl-pending-btn")) button.style.minWidth = `${Math.ceil(width)}px`;
  button.innerHTML = button.classList.contains("tl-pending-btn")
    ? '<span class="tracking-button-spinner" aria-hidden="true"></span>'
    : `<span class="tracking-button-spinner" aria-hidden="true"></span><span>${esc(label)}</span>`;
  return () => {
    button.innerHTML = originalHtml;
    button.disabled = originalDisabled;
    button.removeAttribute("aria-busy");
    button.classList.remove("is-tracking-loading");
    delete button.dataset.loading;
    button.style.minWidth = "";
  };
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
    actor: currentTrackingUser(),
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

function buildBdfgContext() {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  const activeKeys = new Set(state.form?.activeProcessKeys || []);
  const processItems = configuredProcessDefinitions()
    .filter((item) => isProcessAllowedForCurrentFrontBackContext(item.key))
    .map((item) => ({
      id: item.key,
      name: item.label,
      lineCode,
      repeatable: item.repeatable === true,
      locked: item.locked === true,
      added: activeKeys.has(item.key),
      canAdd: item.locked ? false : (item.repeatable === true || !activeKeys.has(item.key))
    }));
  return {
    kind: "calculo-flexografia",
    title: quoteCode ? `Cálculo ${quoteCode}` : "Cálculo de Cotizaciones",
    subtitle: [
      state.form?.header?.customerName || "",
      state.form?.header?.jobName || ""
    ].filter(Boolean).join(" · ") || "Procesos del cálculo activo",
    quoteCode,
    lineCode,
    canEdit: true,
    documentDescription: "Abrir el cálculo actual",
    processes: processItems
  };
}

function publishBdfgContext() {
  if (!isShellEmbedded()) return;
  const message = { type: "erp-bdfg-context", context: buildBdfgContext() };
  window.parent.postMessage(message, window.location.origin);
  if (window.top && window.top !== window.parent) {
    window.top.postMessage(message, window.location.origin);
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
  const digitalDefaults = digitalInkDefaults();
  const substrateMaterial = findMaterial(state.form?.substrate?.materialId);
  const applyStageDefaults = (stage) => {
    if (!stage || typeof stage !== "object") return;
    const machine = findMachine(stage.machineId);
    const digitalSettings = digitalMachineSettings(machine || {}, stage);
    const isDigital = isDigitalProductionMachine(machine);
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
    stage.maculaSetupFeet = force ? defaultPrintMaculaSetupFeet(stage.machineId) : (n(stage.maculaSetupFeet, 0) > 0 ? n(stage.maculaSetupFeet, 0) : defaultPrintMaculaSetupFeet(stage.machineId));
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
      inline.setupWasteFeet = force ? inlineFinishSetupWasteFeet(slot.key) : (n(inline.setupWasteFeet, 0) > 0 ? n(inline.setupWasteFeet, 0) : inlineFinishSetupWasteFeet(slot.key));
      if (slot.key === "barniz") {
        inline.coveragePct = force ? inkDefaults.barnizCoveragePct : (n(inline.coveragePct, 0) > 0 ? n(inline.coveragePct, 0) : inkDefaults.barnizCoveragePct);
        inline.layerGsm = force ? inkDefaults.barnizGsm : (n(inline.layerGsm, 0) > 0 ? n(inline.layerGsm, 0) : inkDefaults.barnizGsm);
      }
    });
    if (isDigital) {
      const materialNeedsPremier = materialRequiresPremier(substrateMaterial);
      const materialPreTreated = materialPremierPreapplied(substrateMaterial);
      stage.digitalBillingType = force ? digitalSettings.billingType : first(stage.digitalBillingType, digitalSettings.billingType, digitalDefaults.billingType);
      stage.digitalInkCostPerKg = force ? digitalSettings.inkCostPerKg : firstPositiveNumber(stage.digitalInkCostPerKg, digitalSettings.inkCostPerKg);
      stage.digitalWhiteInkCostPerKg = force ? digitalSettings.whiteInkCostPerKg : firstPositiveNumber(stage.digitalWhiteInkCostPerKg, digitalSettings.whiteInkCostPerKg);
      stage.digitalSpecialInkCostPerKg = force ? digitalSettings.specialInkCostPerKg : firstPositiveNumber(stage.digitalSpecialInkCostPerKg, digitalSettings.specialInkCostPerKg);
      stage.digitalClickRate = force ? digitalSettings.clickRate : firstPositiveNumber(stage.digitalClickRate, digitalSettings.clickRate);
      stage.digitalClickMode = force ? digitalSettings.clickMode : first(stage.digitalClickMode, digitalSettings.clickMode, digitalDefaults.clickMode);
      stage.digitalCmykCoveragePct = force ? digitalDefaults.cmykCoveragePct : firstPositiveNumber(stage.digitalCmykCoveragePct, digitalDefaults.cmykCoveragePct);
      stage.digitalWhiteCoveragePct = force ? digitalDefaults.whiteCoveragePct : firstPositiveNumber(stage.digitalWhiteCoveragePct, digitalDefaults.whiteCoveragePct);
      stage.digitalCmykGsm = force ? digitalSettings.cmykGsm : firstPositiveNumber(stage.digitalCmykGsm, digitalSettings.cmykGsm);
      stage.digitalWhiteGsm = force ? digitalSettings.whiteGsm : firstPositiveNumber(stage.digitalWhiteGsm, digitalSettings.whiteGsm);
      stage.digitalWasteFactor = force ? digitalSettings.wasteFactor : firstPositiveNumber(stage.digitalWasteFactor, digitalSettings.wasteFactor);
      stage.digitalSpecialWashCost = force ? digitalSettings.specialWashCost : firstPositiveNumber(stage.digitalSpecialWashCost, digitalSettings.specialWashCost);
      stage.digitalPremierMode = force ? digitalSettings.premierMode : first(stage.digitalPremierMode, digitalSettings.premierMode, digitalDefaults.premierMode);
      stage.digitalPremierSetupMin = force ? digitalSettings.premierSetupMin : firstPositiveNumber(stage.digitalPremierSetupMin, digitalSettings.premierSetupMin);
      stage.digitalPremierConsumptionGm2 = force
        ? firstPositiveNumber(substrateMaterial?.premierConsumptionGm2, substrateMaterial?.premier_consumo_g_m2, digitalDefaults.premierConsumptionGm2)
        : firstPositiveNumber(stage.digitalPremierConsumptionGm2, substrateMaterial?.premierConsumptionGm2, substrateMaterial?.premier_consumo_g_m2, digitalDefaults.premierConsumptionGm2);
      stage.digitalPremierCostPerKg = force
        ? firstPositiveNumber(substrateMaterial?.premierCostPerKgUsd, substrateMaterial?.premier_costo_x_kg, digitalDefaults.premierCostPerKg)
        : firstPositiveNumber(stage.digitalPremierCostPerKg, substrateMaterial?.premierCostPerKgUsd, substrateMaterial?.premier_costo_x_kg, digitalDefaults.premierCostPerKg);
      stage.digitalPremierCostPerM2 = force
        ? firstPositiveNumber(substrateMaterial?.premierCostPerM2Usd, substrateMaterial?.premier_costo_x_m2, digitalDefaults.premierCostPerM2)
        : firstPositiveNumber(stage.digitalPremierCostPerM2, substrateMaterial?.premierCostPerM2Usd, substrateMaterial?.premier_costo_x_m2, digitalDefaults.premierCostPerM2);
      stage.digitalPremierOfflineCostPerMeter = force ? digitalSettings.premierOfflineCostPerMeter : firstPositiveNumber(stage.digitalPremierOfflineCostPerMeter, digitalSettings.premierOfflineCostPerMeter);
      stage.digitalPremierMaintenanceCost = force ? digitalSettings.premierMaintenanceCost : firstPositiveNumber(stage.digitalPremierMaintenanceCost, digitalSettings.premierMaintenanceCost);
      stage.requiresSubstrateTreatment = materialNeedsPremier && !materialPreTreated;
    }
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
    ensureActiveProcessKeys(false);
    ensureConfiguredProcessInstances();
    activePrintStages().forEach((stage, stageIndex) => {
      INLINE_PRINT_SLOTS.forEach((slot) => {
        if (stage?.inlineFinishes?.[slot.key]?.active) applyInlineFinishSetupDefaults(stageIndex, slot.key, true);
      });
    });
    renderProcessLauncher();
    renderProcessPicker();
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

function cleanLabel(value) {
  return String(value ?? "")
    .replace(/Impresi\?n/gi, "Impresión")
    .replace(/Diseno/gi, "Diseño")
    .replace(/Calculo/gi, "Cálculo")
    .replace(/Maquina/gi, "Máquina")
    .replace(/Area/gi, "Área")
    .replace(/Elongacion/gi, "Elongación")
    .replace(/lamina/gi, "lámina");
}

function norm(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function first(...values) {
  for (const value of values) if (value !== undefined && value !== null && value !== "") return value;
  return "";
}

function normalizeFrontBackGroupData(rowOrRaw = {}) {
  const group = rowOrRaw?.grupoFrenteDorso || rowOrRaw?.grupo_frente_dorso || rowOrRaw?.frontBackGroup || rowOrRaw?.raw_data?.grupoFrenteDorso || rowOrRaw?.raw_data?.Grupo_Frente_Dorso || rowOrRaw?.Grupo_Frente_Dorso || rowOrRaw;
  if (!group || typeof group !== "object" || Array.isArray(group)) return null;
  const explicitElements = Array.isArray(group.elementLineCodes)
    ? group.elementLineCodes.map((item) => String(item || "").trim()).filter(Boolean)
    : Array.isArray(group.elementos)
      ? group.elementos.map((item) => String(item?.lineCode || item?.linea || item || "").trim()).filter(Boolean)
      : [];
  const legacyMembers = Array.isArray(group.memberLineCodes)
    ? group.memberLineCodes.map((item) => String(item || "").trim()).filter(Boolean)
    : [group.primaryLineCode, group.partnerLineCode].map((item) => String(item || "").trim()).filter(Boolean);
  const memberLineCodes = [...new Set((explicitElements.length ? explicitElements : legacyMembers).filter(Boolean))];
  const groupLineCode = String(first(group.groupLineCode, group.lineaGrupo, group.primaryLineCode, memberLineCodes[0]) || "").trim();
  const roleText = String(first(group.role, group.rol) || "").trim().toLowerCase();
  if (!group.groupId || !groupLineCode || !memberLineCodes.length) return null;
  return {
    ...group,
    role: ["elemento", "componente", "frente", "dorso"].includes(roleText) ? "elemento" : "grupo",
    groupLineCode,
    primaryLineCode: groupLineCode,
    elementLineCodes: memberLineCodes,
    memberLineCodes,
    elementRole: String(first(group.elementRole, group.ladoElemento) || "").trim()
  };
}

function currentFrontBackGroup() {
  return normalizeFrontBackGroupData(state.context?.calculo?.grupoFrenteDorso || state.context?.calculo?.frontBackGroup || state.context?.calculo?.raw_data || {});
}

function frontBackGroupQuantity(group = currentFrontBackGroup()) {
  if (!group) return 0;
  const related = Array.isArray(state.context?.lineasRelacionadas) ? state.context.lineasRelacionadas : [];
  const groupLine = related.find((line) => String(line?.line_code || line?.linea || "").trim() === group.groupLineCode);
  return n(first(groupLine?.quantity, groupLine?.raw_data?.["Cantidad Productos"], state.context?.calculo?.quantityProducts), 0);
}

function isFrontBackElementContext() {
  return currentFrontBackGroup()?.role === "elemento";
}

function isFrontBackGroupContext() {
  return currentFrontBackGroup()?.role === "grupo";
}

function isEmbeddedView() {
  return new URLSearchParams(window.location.search).get("embedded") === "1";
}

function isFrontBackEmbeddedElementContext() {
  return isEmbeddedView() && isFrontBackElementContext();
}

function relatedFrontBackLines(group = currentFrontBackGroup()) {
  if (!group) return { groupLine: null, elements: [] };
  const current = state.context?.calculo || null;
  const related = Array.isArray(state.context?.lineasRelacionadas) ? state.context.lineasRelacionadas : [];
  const byCode = new Map(
    [current, ...related]
      .filter(Boolean)
      .map((line) => [String(line.lineCode || line.line_code || line.linea || "").trim(), line])
      .filter(([code]) => Boolean(code))
  );
  const groupLine = byCode.get(group.groupLineCode) || (String(current?.lineCode || "").trim() === group.groupLineCode ? current : null);
  const elementCodes = Array.isArray(group.elementLineCodes) ? group.elementLineCodes : group.memberLineCodes || [];
  const elements = elementCodes
    .map((lineCode, index) => {
      const code = String(lineCode || "").trim();
      const line = byCode.get(code);
      if (!line) return null;
      const role = String(group.elementRoles?.[code] || (index === 0 ? "frente" : "dorso")).trim();
      return { line, code, role, index };
    })
    .filter(Boolean);
  return { groupLine, elements };
}

function storedLineRaw(line = {}) {
  return line.raw_data || line.rawData || {};
}

function storedLineJobName(line = {}) {
  const raw = storedLineRaw(line);
  return first(line.jobName, line.job_name, raw["NOMBRE TRABAJO"], raw["Nombre Trabajo"], line.lineCode, line.line_code, "");
}

function storedLineSubtotal(line = {}) {
  const raw = storedLineRaw(line);
  return n(first(
    raw.Datos_Cotizados?.industrial,
    raw["GENERAL | 5 | SUBTOTAL"],
    line.totalCost,
    line.total_cost,
    line.subtotal_1,
    raw.Datos_Cotizados?.total,
    raw["PRECIO TOTAL AL FINALIZAR"],
    raw["GENERAL | 9 | TOTAL | DOL"],
    raw["GENERAL | 7 | TOTAL | DOL"]
  ), 0);
}

function frontBackElementSubtotalSummary(group = currentFrontBackGroup()) {
  const related = relatedFrontBackLines(group);
  const items = related.elements.map((item) => ({
    ...item,
    subtotal: storedLineSubtotal(item.line)
  }));
  return {
    items,
    subtotal: r(items.reduce((sum, item) => sum + n(item.subtotal, 0), 0))
  };
}

function storedLineRoute(line = {}) {
  const quoteCode = first(line.quoteCode, line.quote_code, state.form?.header?.quoteCode, "");
  const lineCode = first(line.lineCode, line.line_code, line.linea, "");
  if (!quoteCode || !lineCode) return "";
  return buildLineCalculationRoute({
    lineCode,
    quoteCode,
    productId: first(line.productCode, line.product_code, lineCode),
    department: first(line.department, line.departmento, storedLineRaw(line).DEPARTAMENTO, "Flexografia")
  });
}

function frontBackSharedProcessKeys() {
  return new Set(["sustrato", "preprensa", "planchas", "impresion", "barnizado", "laminado", "estampado", "embosado", "troquelado", "rebobinado", "empaque"]);
}

function isProcessAllowedForCurrentFrontBackContext(key = "") {
  if (isFrontBackEmbeddedElementContext() && ["troquel", "sustrato", "impresion"].includes(norm(key))) return false;
  return true;
}

function lineCodeFromLine(line = {}) {
  return String(first(line.lineCode, line.line_code, line.linea, "") || "").trim();
}

function routeWithQueryParam(route = "", key = "", value = "") {
  if (!route || !key) return route;
  try {
    const url = new URL(route, window.location.origin);
    url.searchParams.set(key, value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_) {
    const joiner = route.includes("?") ? "&" : "?";
    return `${route}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

function frontBackEmbeddedRoute(line = {}) {
  const route = storedLineRoute(line);
  return routeWithQueryParam(route, "embedded", "1");
}

function resizeFrontBackEmbeddedFrame(frame) {
  if (!frame) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return;
    const resize = () => {
      const bodyHeight = Math.max(doc.body?.scrollHeight || 0, doc.body?.offsetHeight || 0);
      const contentBottom = Math.max(
        bodyHeight,
        ...Array.from(doc.body?.children || []).map((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom;
        })
      );
      const height = Math.max(
        240,
        Math.ceil(contentBottom + 2)
      );
      frame.style.height = `${height}px`;
    };
    resize();
    frame._frontBackResizeObserver?.disconnect?.();
    if (doc.body && window.ResizeObserver) {
      const observer = new ResizeObserver(resize);
      observer.observe(doc.body);
      frame._frontBackResizeObserver = observer;
    }
    [250, 800, 1600].forEach((delay) => setTimeout(resize, delay));
  } catch (_) {
    frame.style.height = "1200px";
  }
}

function bindFrontBackEmbeddedFrame() {
  const frame = els.frontBackElementsBody?.querySelector("[data-front-back-embedded-frame]");
  if (!frame) return;
  frame.addEventListener("load", () => resizeFrontBackEmbeddedFrame(frame), { once: true });
}

async function refreshFrontBackEmbeddedLine(lineCode = "") {
  const quoteCode = state.form?.header?.quoteCode || "";
  if (!quoteCode || !lineCode) return;
  try {
    const payload = await getJson(`/api/flexo/calculo?quoteId=${encodeURIComponent(quoteCode)}&lineId=${encodeURIComponent(lineCode)}`);
    const next = payload?.calculo;
    if (!next) return;
    state.context.lineasRelacionadas = (state.context.lineasRelacionadas || []).map((line) => (
      lineCodeFromLine(line) === lineCode ? { ...line, ...next, raw_data: next.raw_data || line.raw_data } : line
    ));
  } catch (_) {
    // La línea embebida se mantiene visible aunque no se pueda refrescar el resumen del padre.
  }
}

async function persistFrontBackEmbeddedFrame(lineCode = "") {
  const frame = els.frontBackElementsBody?.querySelector(`[data-front-back-embedded-frame][data-line-code="${CSS.escape(lineCode)}"]`);
  if (!frame) return;
  try {
    const win = frame.contentWindow;
    if (typeof win?.persistCalculation === "function") {
      await win.persistCalculation();
    }
  } catch (_) {
    // El cálculo embebido mantiene su propio guardado automático.
  }
  await refreshFrontBackEmbeddedLine(lineCode);
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
    dieShape: first(die.clasificacion, die.tipoTroquel, die.tipoTroquel2, die.formato, context?.raw_data?.["REQ | Forma"], context?.dieShape, ""),
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
  const source = dynamic.length ? dynamic : DEFAULT_OUTPUT_TYPES;
  return [...source].sort((left, right) => {
    const leftLabel = String(left?.name || left?.nombre || left?.id || left?.codigo || left || "").trim();
    const rightLabel = String(right?.name || right?.nombre || right?.id || right?.codigo || right || "").trim();
    return leftLabel.localeCompare(rightLabel, "es", { sensitivity: "base" });
  });
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

function ensureInfoPopover() {
  if (state.infoPopover.panel) return state.infoPopover.panel;
  const panel = document.createElement("div");
  panel.className = "info-popover-panel info-popover-panel-global";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.innerHTML = `
    <div class="info-popover-panel-head">
      <strong class="info-popover-panel-title"></strong>
      <button type="button" class="info-popover-panel-close" aria-label="Cerrar información">×</button>
    </div>
    <div class="info-popover-panel-body"></div>
  `;
  state.infoPopover.panel = panel;
  state.infoPopover.title = panel.querySelector(".info-popover-panel-title");
  state.infoPopover.body = panel.querySelector(".info-popover-panel-body");
  state.infoPopover.close = panel.querySelector(".info-popover-panel-close");
  state.infoPopover.close?.addEventListener("click", closeInfoPopover);
  document.body.appendChild(panel);
  return panel;
}

function closeInfoPopover() {
  if (state.infoPopover.trigger) {
    state.infoPopover.trigger.setAttribute("aria-expanded", "false");
  }
  if (state.infoPopover.panel) {
    state.infoPopover.panel.hidden = true;
  }
  state.infoPopover.trigger = null;
}

function positionInfoPopover(trigger = state.infoPopover.trigger) {
  const panel = state.infoPopover.panel;
  if (!panel || !trigger || panel.hidden) return;
  const rect = trigger.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const panelWidth = panelRect.width || 280;
  const panelHeight = panelRect.height || 180;
  const margin = 8;
  const gap = 10;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  const triggerCenter = rect.left + (rect.width / 2);
  let left = triggerCenter - (panelWidth / 2);
  let top = rect.top - panelHeight - gap;
  let isBelow = false;

  const minLeft = margin;
  const maxLeft = viewportWidth - panelWidth - margin;
  const minTop = margin;
  const maxTop = viewportHeight - panelHeight - margin;

  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = Math.max(minLeft, maxLeft);

  if (top < minTop) {
    const fallbackBelow = rect.bottom + gap;
    top = fallbackBelow <= maxTop ? fallbackBelow : Math.max(minTop, maxTop);
    isBelow = top >= fallbackBelow;
  }
  if (top > maxTop) top = Math.max(minTop, maxTop);

  const arrowLeft = Math.min(Math.max(triggerCenter - left - 5, 14), panelWidth - 24);
  panel.classList.toggle("is-below", isBelow);
  panel.style.setProperty("--info-arrow-left", `${Math.round(arrowLeft)}px`);
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
}

function openInfoPopover(trigger) {
  const title = String(trigger?.dataset.infoTitle || "").trim();
  const body = String(trigger?.dataset.infoBody || "").trim();
  if (!title && !body) return;
  const panel = ensureInfoPopover();
  if (state.infoPopover.trigger === trigger && !panel.hidden) {
    closeInfoPopover();
    return;
  }
  if (state.infoPopover.trigger) {
    state.infoPopover.trigger.setAttribute("aria-expanded", "false");
  }
  state.infoPopover.trigger = trigger;
  state.infoPopover.title.textContent = title || "Información";
  state.infoPopover.body.textContent = body || "";
  trigger.setAttribute("aria-expanded", "true");
  panel.hidden = false;
  requestAnimationFrame(() => positionInfoPopover(trigger));
}

function showInfoPopover(trigger) {
  const panel = ensureInfoPopover();
  if (state.infoPopover.trigger === trigger && !panel.hidden) {
    positionInfoPopover(trigger);
    return;
  }
  openInfoPopover(trigger);
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

function getProcessDeleteIconConfig() {
  const icons = state.config?.icons || {};
  const general = state.config?.general || {};
  return {
    value: icons.quoteRequestAttachmentDelete || icons.lineDelete || "🗑",
    primary: general.iconColorQuoteRequestAttachmentDelete || general.iconColorLineDelete || "#b94848",
    hover: general.iconColorHoverQuoteRequestAttachmentDelete || general.iconColorHoverLineDelete || "#d03535",
    size: Number(general.iconSizeQuoteRequestAttachmentDelete || general.iconSizeLineDelete) || 18
  };
}

function getQuantityCapacity() {
  const containerWidth = Math.max(0, els.quantityRepeater?.clientWidth || 0);
  if (!containerWidth) return 2;
  const layout = { normalWidth: 150, lastWidth: 190, gap: 8 };
  let count = 1;
  while (count < 6) {
    const width = ((count - 1) * layout.normalWidth) + layout.lastWidth + ((count - 1) * layout.gap);
    if (width > containerWidth) return Math.max(1, count - 1);
    count += 1;
  }
  return 6;
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
    totalPies: n(row?.totalPies, 0) > 0 ? n(row?.totalPies, 0) : r(n(row?.porEstacion, 0) * n(row?.cantidadTintas, 0), 2)
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
  const montajeSource = Array.isArray(source.maculaMontaje) && source.maculaMontaje.length ? source.maculaMontaje : fallback.maculaMontaje;
  const tirajeSource = Array.isArray(source.maculaTiraje) && source.maculaTiraje.length ? source.maculaTiraje : fallback.maculaTiraje;
  const resolvedSource = montajeSource === fallback.maculaMontaje && tirajeSource === fallback.maculaTiraje ? "convencional" : variant;
  return {
    source: resolvedSource,
    montajeRows: normalizeMaculaMontajeRows(montajeSource),
    tirajeRows: normalizeMaculaTirajeRows(tirajeSource)
  };
}

function machineStartupWasteFeet(machineId = "") {
  const machine = findMachine(machineId);
  return firstPositiveNumber(machine?.maculaDefaultFeet, machine?.macula_default_pies, machine?.startupWasteFeet, machine?.setupWasteFeet, 0);
}

function defaultPrintMaculaSetupFeet(machineId = "") {
  const machineFeet = machineStartupWasteFeet(machineId);
  if (machineFeet > 0) return machineFeet;
  const config = defaultMaculaConfig();
  const row = (config.montajeRows || []).find((item) => normalizeMaculaProcessKey(item.detalle) === "impresion");
  return n(row?.totalPies, 0);
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

function digitalInkDefaults() {
  const defaults = state.costsConfig?.digital?.tintaGeneral || {};
  const premier = state.costsConfig?.digital?.premier || {};
  const velocidad = state.costsConfig?.digital?.velocidad || {};
  const baseInkCostPerKg = n(first(defaults.costPerKg, defaults.costoKgTinta), 0);
  const whiteInkCostPerKg = firstPositiveNumber(
    n(first(defaults.whiteCostPerKg, defaults.costoKgTintaBlanco), 0),
    baseInkCostPerKg
  );
  const specialInkCostPerKg = firstPositiveNumber(
    n(first(defaults.specialCostPerKg, defaults.costoKgTintaEspecial), 0),
    baseInkCostPerKg
  );
  return {
    billingType: String(first(defaults.billingType, defaults.tipoCobro, "consumo")).toLowerCase(),
    cmykCoveragePct: n(first(defaults.coverageCmykPct, defaults.coberturaCmykPct), 30),
    whiteCoveragePct: n(first(defaults.coverageWhitePct, defaults.coberturaBlancoPct), 100),
    cmykGsm: n(first(defaults.cmykGm2, defaults.gramajeCmykGm2), 1.5),
    whiteGsm: n(first(defaults.whiteGm2, defaults.gramajeBlancoGm2), 4),
    wasteFactor: n(first(defaults.wasteFactor, defaults.factorMerma), 1.1),
    inkCostPerKg: baseInkCostPerKg,
    whiteInkCostPerKg,
    specialInkCostPerKg,
    clickRate: n(first(defaults.clickRate, defaults.tarifaClick), 0),
    clickMode: String(first(defaults.clickMode, defaults.modoClick, "por_estacion")).toLowerCase(),
    specialWashCost: n(first(defaults.specialWashCost, defaults.costoLavadoEspecial), 0),
    speedCmykMpm: n(first(velocidad.speedCmykMpm, defaults.speedCmykMpm), 0),
    speedExtendedMpm: n(first(velocidad.speedExtendedMpm, defaults.speedExtendedMpm), 0),
    premierMode: String(first(premier.mode, defaults.premierModo, "offline")).toLowerCase(),
    premierSetupMin: n(first(premier.setupMin, defaults.premierSetupMin), 20),
    premierConsumptionGm2: n(first(premier.consumptionGm2, defaults.premierConsumoGm2), 0.65),
    premierCostPerKg: n(first(premier.costPerKg, defaults.premierCostoKg), 0),
    premierCostPerM2: n(first(premier.costPerM2, defaults.premierCostoM2), 0),
    premierOfflineCostPerMeter: n(first(premier.offlineCostPerMeter, defaults.premierCostoOfflineM), 0),
    premierMaintenanceCost: n(first(premier.maintenanceCost, defaults.premierMantenimiento), 0)
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

function inlineFinishSetupWasteFeet(processKey = "") {
  const rows = state.costsConfig?.convencional?.inlineFinishSetup || [];
  const target = normalizeMaculaProcessKey(processKey);
  const row = rows.find((item) => normalizeMaculaProcessKey(item?.proceso) === target)
    || rows.find((item) => target.includes(normalizeMaculaProcessKey(item?.proceso)))
    || rows.find((item) => normalizeMaculaProcessKey(item?.proceso).includes(target));
  return n(row?.setupWasteFeet, 0);
}

function applyInlineFinishSetupDefaults(stageIndex, inlineKey, force = false) {
  const stage = state.form?.printStages?.[stageIndex];
  const inline = stage?.inlineFinishes?.[inlineKey];
  if (!inline) return;
  const inkDefaults = conventionalInkDefaults();
  inline.setupMinutes = force || n(inline.setupMinutes, 0) <= 0
    ? inlineFinishSetupMinutes(inlineKey)
    : n(inline.setupMinutes, 0);
  inline.setupWasteFeet = force || n(inline.setupWasteFeet, 0) <= 0
    ? inlineFinishSetupWasteFeet(inlineKey)
    : n(inline.setupWasteFeet, 0);
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

function configuredProcessDefinitions() {
  const rows = Array.isArray(state.costsConfig?.general?.processDefaults) ? state.costsConfig.general.processDefaults : [];
  const fallbackByKey = Object.fromEntries(PROCESS_CONFIG_FALLBACK.map((item) => [item.key, item]));
  const seen = new Set();
  const merged = rows.map((item) => {
    const key = norm(item?.key);
    if (INTERNAL_PROCESS_KEYS.has(key)) return null;
    const fallback = fallbackByKey[key];
    if (!fallback || seen.has(key)) return null;
    seen.add(key);
    const locked = key === "troquel" ? true : (item?.locked === true || String(item?.locked || "").trim().toLowerCase() === "true");
    const active = locked ? true : (item?.active === true || String(item?.active || "").trim().toLowerCase() === "true");
    const createEnabled = item?.createEnabled === true
      || item?.create === true
      || String(item?.createEnabled ?? item?.create ?? fallback.createEnabled ?? "").trim().toLowerCase() === "true";
    const repeatable = item?.repeatable === true || String(item?.repeatable || "").trim().toLowerCase() === "true";
    return {
      ...PROCESS_MENU_BY_KEY[key],
      key,
      label: first(item?.label, fallback.label, PROCESS_MENU_BY_KEY[key]?.label, key),
      locked,
      active,
      createEnabled: active ? createEnabled : false,
      repeatable,
      order: n(item?.order, fallback.order),
      minimumCost: Math.max(0, n(item?.minimumCost, 0))
    };
  }).filter(Boolean);
  PROCESS_CONFIG_FALLBACK.forEach((item) => {
    if (seen.has(item.key)) return;
    merged.push({
      ...PROCESS_MENU_BY_KEY[item.key],
      ...item
    });
  });
  return merged.sort((left, right) => n(left.order, 999) - n(right.order, 999));
}

function localProcessCategory(key = "") {
  const normalized = norm(key);
  if (["diseno"].includes(normalized)) return "diseno";
  if (["preprensa"].includes(normalized)) return "preprensa";
  if (["planchas"].includes(normalized)) return "planchas";
  if (["impresion"].includes(normalized)) return "impresion";
  if (["barnizado", "laminado", "estampado", "embosado", "troquelado", "rebobinado"].includes(normalized)) return "acabados";
  if (["empaque"].includes(normalized)) return "empaque";
  return "soporte";
}

function processHelperText(key = "") {
  return String(PROCESS_MENU_BY_KEY[norm(key)]?.helper || "").trim();
}

function buildLocalProcessCatalog(sourceProcesses = []) {
  const source = Array.isArray(sourceProcesses) ? sourceProcesses : [];
  const sourceByKey = new Map();

  source.forEach((item) => {
    const candidates = [
      item?.key,
      item?.processKey,
      item?.codigo,
      item?.id,
      item?.nombre,
      item?.name,
      item?.descripcion
    ].map((value) => norm(value)).filter(Boolean);
    const matchedKey = candidates.find((candidate) => PROCESS_MENU_BY_KEY[candidate]);
    if (matchedKey && !sourceByKey.has(matchedKey)) {
      sourceByKey.set(matchedKey, item);
    }
  });

  return configuredProcessDefinitions().map((item) => {
    const sourceItem = sourceByKey.get(item.key) || null;
    const category = localProcessCategory(item.key);
    const label = first(item.label, PROCESS_MENU_BY_KEY[item.key]?.label, item.key);
    return {
      id: item.key,
      key: item.key,
      codigo: first(sourceItem?.codigo, item.key.toUpperCase()),
      nombre: label,
      name: label,
      descripcion: first(processHelperText(item.key), sourceItem?.descripcion, label),
      categoria: category,
      subcategoria: first(sourceItem?.subcategoria, ""),
      machine_id: "",
      machine_name: "",
      proceso_productivo: first(sourceItem?.proceso_productivo, item.key === "impresion" ? "convencional" : ""),
      modo_recurso: first(sourceItem?.modo_recurso, "mixto"),
      cantidad_personas: n(sourceItem?.cantidad_personas, 0),
      tiempo_preparacion_general: n(sourceItem?.tiempo_preparacion_general, 0),
      tiempo_por_estacion: n(sourceItem?.tiempo_por_estacion, 0),
      tiempo_fijo_min: n(sourceItem?.tiempo_fijo_min, 0),
      velocidad_produccion: n(sourceItem?.velocidad_produccion, 0),
      unidad_trabajo: first(sourceItem?.unidad_trabajo, "pies"),
      costo_hora_maquina: n(sourceItem?.costo_hora_maquina, 0),
      costo_hora_operario: n(sourceItem?.costo_hora_operario, 0),
      costo_fijo: n(sourceItem?.costo_fijo, 0),
      costo_x_msi: n(sourceItem?.costo_x_msi, 0),
      costo_x_kg: n(sourceItem?.costo_x_kg, 0),
      costo_x_pie: n(sourceItem?.costo_x_pie, 0),
      costo_x_millar: n(sourceItem?.costo_x_millar, 0),
      formula_tiempo: first(sourceItem?.formula_tiempo, ""),
      formula_costo: first(sourceItem?.formula_costo, ""),
      orden_base: n(item.order, 999),
      activo: item.active !== false,
      locked: item.locked === true,
      minimumCost: Math.max(0, n(item.minimumCost, 0)),
      legacyIds: sourceItem?.id ? [String(sourceItem.id)] : []
    };
  });
}

function processMeta(key = "") {
  const target = norm(key);
  if (INTERNAL_PROCESS_KEYS.has(target)) return null;
  return configuredProcessDefinitions().find((item) => item.key === target) || PROCESS_MENU_BY_KEY[target] || null;
}

function processDisplayOrder(key = "") {
  return n(processMeta(key)?.order, 999);
}

function processMinimumCost(key = "") {
  return Math.max(0, n(processMeta(key)?.minimumCost, 0));
}

function processCreateEnabled(key = "") {
  const target = norm(key);
  if (target === "macula") return true;
  const meta = processMeta(target);
  return meta?.createEnabled === true;
}

function applyProcessMinimum(processKey, rawSubtotal) {
  const minimumCost = processMinimumCost(processKey);
  const normalizedRaw = r(rawSubtotal);
  return {
    processKey,
    rawSubtotal: normalizedRaw,
    minimumCost,
    minimumApplied: minimumCost > 0 && normalizedRaw < minimumCost,
    subtotal: minimumCost > 0 ? r(Math.max(normalizedRaw, minimumCost)) : normalizedRaw
  };
}

function minimumCostExampleLines(calcResult, processLabel = "Proceso") {
  if (!calcResult || (n(calcResult.minimumCost, 0) <= 0 && !calcResult.minimumApplied)) return [];
  const lines = [
    `Costo mínimo ${processLabel}: ${formulaValue(calcResult.minimumCost || 0, 2)}`
  ];
  if (calcResult.minimumApplied) {
    lines.push(`Aplicación final: max( ${formulaValue(calcResult.rawSubtotal || 0, 2)} , ${formulaValue(calcResult.minimumCost || 0, 2)} ) = ${formulaValue(calcResult.subtotal || 0, 2)}`);
  }
  return lines;
}

function sortActiveProcessKeys(keys = []) {
  return [...new Set(keys.filter((key) => processMeta(key) && !INTERNAL_PROCESS_KEYS.has(norm(key))))]
    .sort((left, right) => processDisplayOrder(left) - processDisplayOrder(right));
}

function ensureActiveProcessKeys(expanded = false) {
  const current = Array.isArray(state.form.activeProcessKeys) ? state.form.activeProcessKeys : [];
  const configuredAlwaysOn = configuredProcessDefinitions()
    .filter((item) => item.active || item.locked)
    .map((item) => item.key);
  const demoKeys = ["diseno", "planchas", "impresion", "barnizado", "laminado", "estampado", "embosado", "troquelado", "rebobinado", "empaque", "adicionales"];
  const next = sortActiveProcessKeys(expanded ? current.concat(configuredAlwaysOn, demoKeys) : current.concat(configuredAlwaysOn));
  state.form.activeProcessKeys = next;
}

function hasActiveProcess(key) {
  return isProcessAllowedForCurrentFrontBackContext(key) && Array.isArray(state.form.activeProcessKeys) && state.form.activeProcessKeys.includes(key);
}

function activePrintStages() {
  return Array.isArray(state.form.printStages) ? state.form.printStages : [];
}

function inlineKeyForExternalFinish(processKey = "") {
  return Object.entries(INLINE_EXTERNAL_FINISH_KEY).find((entry) => entry[1] === processKey)?.[0] || "";
}

function primaryPrintMachineForForm(form = state.form) {
  const stage = Array.isArray(form?.printStages) && form.printStages.length ? form.printStages[0] : form?.print;
  return findMachine(stage?.machineId || form?.print?.machineId || "");
}

function isSystemManagedFinish(finish = {}) {
  return finish.autoManaged === true || finish.source === "system" || finish.origin === "system";
}

function syncInlineFinishesForMachine(stageIndex = 0) {
  const stage = state.form?.printStages?.[stageIndex];
  if (!stage?.inlineFinishes) return;
  const machine = findMachine(stage.machineId);
  if (!machineSupportsInline(machine)) return;
  Object.entries(INLINE_EXTERNAL_FINISH_KEY).forEach(([inlineKey, externalKey]) => {
    const hasSystemFinish = (state.form.finishes || []).some((finish) => finish.processKey === externalKey && finish.active !== false && isSystemManagedFinish(finish));
    const hasInlineProcess = Array.isArray(state.form.activeProcessKeys) && (state.form.activeProcessKeys.includes(inlineKey) || state.form.activeProcessKeys.includes(externalKey));
    if (!hasSystemFinish && !hasInlineProcess) return;
    stage.inlineFinishes[inlineKey] = { ...(stage.inlineFinishes[inlineKey] || {}), active: true };
    applyInlineFinishSetupDefaults(stageIndex, inlineKey, false);
  });
}

function isActiveExternalFinish(finish = {}, form = state.form) {
  const key = String(finish?.processKey || "").trim();
  if (!isProcessAllowedForCurrentFrontBackContext(key)) return false;
  if (!EXTERNAL_FINISH_BY_KEY[key]) return false;
  if (finish.active === false) return false;
  const inlineKey = inlineKeyForExternalFinish(key);
  if (inlineKey && isSystemManagedFinish(finish) && machineSupportsInline(primaryPrintMachineForForm(form))) return false;
  return Array.isArray(form?.activeProcessKeys) && form.activeProcessKeys.includes(key);
}

function activeExternalFinishEntries(form = state.form) {
  return (Array.isArray(form?.finishes) ? form.finishes : [])
    .map((finish, index) => ({ finish, index }))
    .filter((entry) => isActiveExternalFinish(entry.finish, form));
}

function externalConfigForInlineFinish(key) {
  return EXTERNAL_FINISH_BY_KEY[INLINE_EXTERNAL_FINISH_KEY[key]] || null;
}

function isOptionalPlateCostProcess(key) {
  return String(key || "") === "embosado";
}

function createPrintStage(base = {}) {
  const inkDefaults = conventionalInkDefaults();
  const digitalDefaults = digitalInkDefaults();
  const tintaConvencional = conventionalInkMaterialOptions();
  const tintaBlanca = whiteInkMaterialOptions();
  const rawNumbering = state.context?.calculo?.raw_data || {};
  const inlineFinishes = {};
  INLINE_PRINT_SLOTS.forEach((slot) => {
    const source = base.inlineFinishes?.[slot.key] || {};
    const numberingConfig = slot.key === "numerado" ? buildNumberingConfig(rawNumbering, source) : null;
    inlineFinishes[slot.key] = {
      active: source.active === undefined ? ["barniz", "troquelado"].includes(slot.key) : Boolean(source.active),
      processId: source.processId || "",
      materialId: source.materialId || "",
      setupMinutes: n(source.setupMinutes, inlineFinishSetupMinutes(slot.key)),
      costHour: n(source.costHour, 0),
      fixedCost: n(source.fixedCost, 0),
      costPerFoot: n(source.costPerFoot, 0),
      costPerMeter: n(source.costPerMeter, 0),
      costPerMsi: n(source.costPerMsi, 0),
      costPerFt2: n(source.costPerFt2, 0),
      costPerUnit: n(source.costPerUnit, 0),
      costPerKg: n(source.costPerKg, 0),
      layerGft2: n(source.layerGft2, 0),
      coveragePct: slot.key === "barniz"
        ? (n(source.coveragePct, 0) > 0 ? n(source.coveragePct, 0) : inkDefaults.barnizCoveragePct)
        : n(source.coveragePct, 100),
      layerGsm: slot.key === "barniz"
        ? (n(source.layerGsm, 0) > 0 ? n(source.layerGsm, 0) : inkDefaults.barnizGsm)
        : n(source.layerGsm, 0),
      costPerLb: n(source.costPerLb, 0),
      plateCost: n(source.plateCost, 0),
      plateWidthIn: n(source.plateWidthIn, 0),
      plateLengthIn: n(source.plateLengthIn, 0),
      setupWasteFeet: n(source.setupWasteFeet, inlineFinishSetupWasteFeet(slot.key)),
      operationWastePct: n(source.operationWastePct, 0),
      speed: n(source.speed, 0),
      costHourMachine: n(source.costHourMachine, 0),
      costHourOperator: n(source.costHourOperator, 0),
      variableBase: n(source.variableBase, 0),
      variableUnitCost: n(source.variableUnitCost, 0),
      comment: source.comment || numberingConfig?.detail || "",
      numberingType: numberingConfig?.numberingType || "",
      isQr: Boolean(numberingConfig?.isQr),
      rangeFrom: numberingConfig?.rangeFrom || "",
      rangeTo: numberingConfig?.rangeTo || "",
      attachmentName: numberingConfig?.attachmentName || "",
      attachments: numberingConfig?.attachments || [],
      detail: numberingConfig?.detail || "",
      sonified: Boolean(source.sonified)
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
    maculaSetupFeet: n(base.maculaSetupFeet, 0) > 0 ? base.maculaSetupFeet : defaultPrintMaculaSetupFeet(base.machineId),
    maculaTirajeFeet: base.maculaTirajeFeet,
    maculaTirajePct: base.maculaTirajePct,
    coveragePct: n(base.coveragePct, 0) > 0 ? n(base.coveragePct, 0) : inkDefaults.cmykCoveragePct,
    aniloxBcm: n(first(base.aniloxBcm, base.inkGsm), 3),
    transferFactor: n(base.transferFactor, 0.3),
    inkDensity: n(base.inkDensity, 1.5),
    inkMaterialId: base.inkMaterialId || tintaConvencional[0]?.id || "",
    inkMaterialDesc: base.inkMaterialDesc || "",
    inkCostPerLb: n(base.inkCostPerLb, materialCostPerPound(findMaterial(base.inkMaterialId || tintaConvencional[0]?.id || ""))),
    inkGsm: n(base.inkGsm, 0) > 0 ? n(base.inkGsm, 0) : inkDefaults.cmykGsm,
    bcmGenerico: n(base.bcmGenerico, 2),
    whiteInkMaterialId: base.whiteInkMaterialId || tintaBlanca[0]?.id || "",
    whiteInkMaterialDesc: base.whiteInkMaterialDesc || "",
    whiteInkCostPerLb: n(base.whiteInkCostPerLb, materialCostPerPound(findMaterial(base.whiteInkMaterialId || tintaBlanca[0]?.id || "")) || 30),
    pantoneInkCostPerLb: n(base.pantoneInkCostPerLb, 35),
    designCoveragePct: n(base.designCoveragePct, 60),
    requiresSubstrateTreatment: base.requiresSubstrateTreatment,
    digitalBillingType: first(base.digitalBillingType, digitalDefaults.billingType),
    digitalInkCostPerKg: n(base.digitalInkCostPerKg, digitalDefaults.inkCostPerKg),
    digitalWhiteInkCostPerKg: n(base.digitalWhiteInkCostPerKg, digitalDefaults.whiteInkCostPerKg),
    digitalSpecialInkCostPerKg: n(base.digitalSpecialInkCostPerKg, digitalDefaults.specialInkCostPerKg),
    digitalClickRate: n(base.digitalClickRate, digitalDefaults.clickRate),
    digitalClickMode: first(base.digitalClickMode, digitalDefaults.clickMode),
    digitalCmykCoveragePct: n(base.digitalCmykCoveragePct, digitalDefaults.cmykCoveragePct),
    digitalWhiteCoveragePct: n(base.digitalWhiteCoveragePct, digitalDefaults.whiteCoveragePct),
    digitalCmykGsm: n(base.digitalCmykGsm, digitalDefaults.cmykGsm),
    digitalWhiteGsm: n(base.digitalWhiteGsm, digitalDefaults.whiteGsm),
    digitalWasteFactor: n(base.digitalWasteFactor, digitalDefaults.wasteFactor),
    digitalSpecialColors: n(base.digitalSpecialColors, 0),
    digitalSpecialWashCount: n(base.digitalSpecialWashCount, 0),
    digitalSpecialWashCost: n(base.digitalSpecialWashCost, digitalDefaults.specialWashCost),
    digitalPremierMode: first(base.digitalPremierMode, digitalDefaults.premierMode),
    digitalPremierSetupMin: n(base.digitalPremierSetupMin, digitalDefaults.premierSetupMin),
    digitalPremierConsumptionGm2: n(base.digitalPremierConsumptionGm2, digitalDefaults.premierConsumptionGm2),
    digitalPremierCostPerKg: n(base.digitalPremierCostPerKg, digitalDefaults.premierCostPerKg),
    digitalPremierCostPerM2: n(base.digitalPremierCostPerM2, digitalDefaults.premierCostPerM2),
    digitalPremierOfflineCostPerMeter: n(base.digitalPremierOfflineCostPerMeter, digitalDefaults.premierOfflineCostPerMeter),
    digitalPremierMaintenanceCost: n(base.digitalPremierMaintenanceCost, digitalDefaults.premierMaintenanceCost),
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
    source: base.source || base.origin || "user",
    autoManaged: base.autoManaged === true || base.source === "system" || base.origin === "system",
    comment: base.comment || ""
  };
}

function ensureConfiguredProcessInstances() {
  const activeKeys = new Set(state.form?.activeProcessKeys || []);
  configuredProcessDefinitions().forEach((meta) => {
    if (!activeKeys.has(meta.key)) return;
    if (EXTERNAL_FINISH_BY_KEY[meta.key]) {
      const config = EXTERNAL_FINISH_BY_KEY[meta.key];
      const finishes = Array.isArray(state.form.finishes) ? state.form.finishes : [];
      if (finishes.some((item) => item.processKey === meta.key)) return;
      const process = findProcessByKeywords(config.keywords);
      const machine = selectSingleMachineOrNull(finishMachines(config));
      const capacity = machine ? finishMachineCapacity(machine, config) : null;
      const material = materialsByClassification(config.materialFamily, config.materialKeywords || [])[0] || null;
      const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
      const wasteDefaults = finishWasteDefault(meta.key);
      state.form.finishes = finishes.concat(createFinishItem({
        processKey: meta.key,
        slotLabel: config.label,
        processId: process?.id || "",
        machineId: machine?.id || "",
        machineName: machine ? machineDisplayName(machine) : "",
        materialId: config.usesMaterial ? (material?.id || "") : "",
        description: process?.nombre || config.label,
        setupMinutes: firstPositiveNumber(machine?.setupBaseMinutes, capacity?.tiempo_preparacion_general, process?.tiempo_preparacion_general, 0),
        speed: firstPositiveNumber(machine?.productionSpeed, capacity?.velocidad_produccion, process?.velocidad_produccion, 0),
        costHour: firstPositiveNumber(machine?.hourlyMachineCost, capacity?.costo_hora_maquina, process?.costo_hora_maquina, process?.costo_hora_operario, 0),
        costHourMachine: firstPositiveNumber(machine?.hourlyMachineCost, capacity?.costo_hora_maquina, process?.costo_hora_maquina, 0),
        costHourOperator: firstPositiveNumber(machine?.hourlyOperatorCost, capacity?.costo_hora_operario, process?.costo_hora_operario, 0),
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
        operationWastePct: wasteDefaults.operationWastePct,
        source: "system",
        autoManaged: true
      }, finishes.length));
    }
  });
}

function syncPrimaryPrintStage() {
  const primary = activePrintStages()[0];
  if (!primary) return;
  state.form.print = { ...state.form.print, ...primary };
}

function addProcessKey(key) {
  const meta = processMeta(key);
  if (!meta) return false;
  if (!isProcessAllowedForCurrentFrontBackContext(key)) return false;
  if (meta?.locked) return false;
  const alreadyActive = hasActiveProcess(key);
  if (!meta.repeatable && alreadyActive) return false;
  if (key === "impresion") {
    state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).concat(key));
    const stages = activePrintStages();
    if (alreadyActive) {
      const seed = stages[stages.length - 1] || state.form.print || {};
      state.form.printStages = stages.concat(createPrintStage(seed));
    } else if (!stages.length) {
      state.form.printStages = [createPrintStage(state.form.print || {})];
    }
    syncPrimaryPrintStage();
    return true;
  }
  if (EXTERNAL_FINISH_BY_KEY[key]) {
      const config = EXTERNAL_FINISH_BY_KEY[key];
      state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).concat(key));
      const finishes = Array.isArray(state.form.finishes) ? state.form.finishes : [];
      const process = findProcessByKeywords(config.keywords);
      const machine = selectSingleMachineOrNull(finishMachines(config));
      const capacity = machine ? finishMachineCapacity(machine, config) : null;
      const material = materialsByClassification(config.materialFamily, config.materialKeywords || [])[0] || null;
      const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
      const wasteDefaults = finishWasteDefault(key);
      state.form.finishes = finishes.concat(createFinishItem({
        processKey: key,
        slotLabel: config.label,
        processId: process?.id || "",
        machineId: machine?.id || "",
        machineName: machine ? machineDisplayName(machine) : "",
        materialId: config.usesMaterial ? (material?.id || "") : "",
        description: process?.nombre || config.label,
        setupMinutes: firstPositiveNumber(machine?.setupBaseMinutes, capacity?.tiempo_preparacion_general, process?.tiempo_preparacion_general, 0),
        speed: firstPositiveNumber(machine?.productionSpeed, capacity?.velocidad_produccion, process?.velocidad_produccion, 0),
        costHour: firstPositiveNumber(machine?.hourlyMachineCost, capacity?.costo_hora_maquina, process?.costo_hora_maquina, process?.costo_hora_operario, 0),
        costHourMachine: firstPositiveNumber(machine?.hourlyMachineCost, capacity?.costo_hora_maquina, process?.costo_hora_maquina, 0),
        costHourOperator: firstPositiveNumber(machine?.hourlyOperatorCost, capacity?.costo_hora_operario, process?.costo_hora_operario, 0),
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
        operationWastePct: wasteDefaults.operationWastePct,
        source: "user",
        autoManaged: false
      }, finishes.length));
    return true;
  }
  state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).concat(key));
  return true;
}

function removeProcessKey(key) {
  const meta = processMeta(key);
  if (!meta) return;
  if (meta?.locked) return;
  if (EXTERNAL_FINISH_BY_KEY[key]) {
    state.form.finishes = (state.form.finishes || []).filter((item) => item.processKey !== key);
  }
  state.form.activeProcessKeys = sortActiveProcessKeys((state.form.activeProcessKeys || []).filter((item) => item !== key));
}

function updateProcessSurface() {
  const active = new Set(state.form.activeProcessKeys || []);
  els.processSections.querySelectorAll(".process-card").forEach((cardNode) => {
    const key = cardNode.dataset.processKey;
    const visible = processMeta(key)?.locked
      || active.has(key)
      || (key && key.startsWith("impresion-") && active.has("impresion"))
      || (key && EXTERNAL_FINISH_BY_KEY[key.split("-").slice(0, -1).join("-")] && active.has(key.split("-").slice(0, -1).join("-")));
    cardNode.classList.toggle("is-hidden-process", !visible);
  });
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No fue posible cargar la información.");
  return payload;
}

function emptyCatalogs() {
  return { materials: [], troqueles: [], machines: [], machineCategories: {}, processes: [], outputTypes: [] };
}

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

function readUserSession() {
  try {
    return JSON.parse(localStorage.getItem("erp-user-session") || sessionStorage.getItem("erp-user-session") || "null");
  } catch (error) {
    return null;
  }
}

function sessionHeaders() {
  const session = readUserSession();
  if (!session) return {};
  return {
    "x-erp-session": JSON.stringify({
      username: session.username || "",
      name: session.name || "",
      permissionName: session.permissionName || ""
    })
  };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders() },
    body: JSON.stringify(body || {})
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No fue posible guardar la información.");
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
  return options.map((item) => {
    const value = String(item || "").trim();
    return { value, label: value ? `${value} in` : value };
  });
}

function processOptions(items, selected = "", placeholder = "Seleccionar...") {
  return [`<option value="">${esc(placeholder)}</option>`]
    .concat(items.map((item) => `<option value="${item.id}"${String(item.id) === String(selected) ? " selected" : ""}>${esc(item.nombre || item.descripcion || item.id)}</option>`))
    .join("");
}

function processOptionsStrict(items, selected = "") {
  const options = items.filter((item) => String(item?.id || "").trim());
  const selectedValue = options.some((item) => String(item.id) === String(selected)) ? selected : "";
  return [`<option value=""${selectedValue ? "" : " selected"}>Seleccionar...</option>`]
    .concat(options.map((item) => `<option value="${esc(item.id)}"${String(item.id) === String(selectedValue) ? " selected" : ""}>${esc(item.nombre || item.descripcion || item.id)}</option>`))
    .join("");
}

function findProcess(id) {
  const target = String(id || "").trim();
  if (!target) return null;
  const normalized = norm(target);
  return (state.catalogs.processes || []).find((item) => {
    if (String(item.id) === target) return true;
    if (Array.isArray(item.legacyIds) && item.legacyIds.includes(target)) return true;
    if (norm(item.key) === normalized) return true;
    if (norm(item.codigo) === normalized) return true;
    return norm(item.nombre) === normalized;
  }) || null;
}

function findMachine(id) {
  return (state.catalogs.machines || []).find((item) => String(item.id) === String(id)) || null;
}

function findMachineByDisplayName(name) {
  const target = norm(name);
  if (!target) return null;
  return (state.catalogs.machines || []).find((item) => norm(machineDisplayName(item)) === target) || null;
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

function autoSelectionSnapshot() {
  const snapshot = state.context?.calculo?.raw_data?.Seleccion_Automatica || {};
  const machineName = String(snapshot?.machineName || "").trim();
  if (!machineName) return snapshot;
  return findMachineByDisplayName(machineName) ? snapshot : { ...snapshot, machineName: "", missingMachine: true };
}

function autoPricingSnapshot() {
  return state.context?.calculo?.raw_data?.Precio_Automatico || {};
}

function autoProcessSnapshot() {
  const declared = state.context?.calculo?.processes;
  if (Array.isArray(declared) && declared.length) return declared;
  const rawDeclared = state.context?.calculo?.raw_data?.Secuencia_Procesos;
  return Array.isArray(rawDeclared) ? rawDeclared : [];
}

function autoWarningsList() {
  return [];
}

function processKeyFromAutoSnapshot(value = "") {
  const token = norm(value);
  if (!token) return "";
  if (token.includes("preprensa")) return "preprensa";
  if (token.includes("planch")) return "planchas";
  if (token.includes("impres")) return "impresion";
  if (token.includes("barniz")) return "barnizado";
  if (token.includes("laminad")) return "laminado";
  if (token.includes("estamp")) return "estampado";
  if (token.includes("embos")) return "embosado";
  if (token.includes("troquel")) return "troquelado";
  if (token.includes("rebob")) return "rebobinado";
  if (token.includes("empaque")) return "empaque";
  if (token.includes("numer") || token.includes("codigo qr") || token.includes("codigo de barras")) return "numerado";
  return "";
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

function digitalMachineSettings(machine, stage = {}) {
  const defaults = digitalInkDefaults();
  const inkCostPerKg = n(first(stage.digitalInkCostPerKg, machine?.digitalInkCostPerKg, defaults.inkCostPerKg), 0);
  const whiteInkCostPerKg = firstPositiveNumber(
    n(first(stage.digitalWhiteInkCostPerKg, machine?.digitalWhiteInkCostPerKg, defaults.whiteInkCostPerKg), 0),
    inkCostPerKg,
    defaults.whiteInkCostPerKg
  );
  const specialInkCostPerKg = firstPositiveNumber(
    n(first(stage.digitalSpecialInkCostPerKg, machine?.digitalSpecialInkCostPerKg, defaults.specialInkCostPerKg), 0),
    inkCostPerKg,
    defaults.specialInkCostPerKg
  );
  return {
    billingType: String(first(stage.digitalBillingType, machine?.digitalBillingType, defaults.billingType, "consumo")).toLowerCase(),
    inkCostPerKg,
    whiteInkCostPerKg,
    specialInkCostPerKg,
    clickRate: n(first(stage.digitalClickRate, machine?.digitalClickRate, defaults.clickRate), 0),
    clickMode: String(first(stage.digitalClickMode, machine?.digitalClickMode, defaults.clickMode, "por_estacion")).toLowerCase(),
    speedCmykMpm: n(first(stage.digitalSpeedCmykMpm, machine?.digitalSpeedCmykMpm, machine?.productionSpeed, defaults.speedCmykMpm), 0),
    speedExtendedMpm: n(first(stage.digitalSpeedExtendedMpm, machine?.digitalSpeedExtendedMpm, defaults.speedExtendedMpm), 0),
    cmykGsm: n(first(stage.digitalCmykGsm, machine?.digitalCmykGsm, defaults.cmykGsm), 1.5),
    whiteGsm: n(first(stage.digitalWhiteGsm, machine?.digitalWhiteGsm, defaults.whiteGsm), 4),
    wasteFactor: n(first(stage.digitalWasteFactor, machine?.digitalWasteFactor, defaults.wasteFactor), 1.1),
    specialWashCost: n(first(stage.digitalSpecialWashCost, machine?.digitalSpecialWashCost, defaults.specialWashCost), 0),
    premierMode: String(first(stage.digitalPremierMode, machine?.digitalPremierMode, defaults.premierMode, "offline")).toLowerCase(),
    premierSetupMin: n(first(stage.digitalPremierSetupMin, machine?.digitalPremierSetupMin, defaults.premierSetupMin), 20),
    premierMaintenanceCost: n(first(stage.digitalPremierMaintenanceCost, machine?.digitalPremierMaintenanceCost, defaults.premierMaintenanceCost), 0),
    premierOfflineCostPerMeter: n(first(stage.digitalPremierOfflineCostPerMeter, machine?.digitalPremierOfflineCostPerMeter, defaults.premierOfflineCostPerMeter), 0)
  };
}

function digitalSpeedForStations(machine, stage, stations) {
  const settings = digitalMachineSettings(machine, stage);
  if (stations > 4) {
    return firstPositiveNumber(settings.speedExtendedMpm, settings.speedCmykMpm, n(stage.speedMetersMin, 0), n(machine?.productionSpeed, 0));
  }
  return firstPositiveNumber(settings.speedCmykMpm, n(stage.speedMetersMin, 0), n(machine?.productionSpeed, 0));
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

function inlineFinishAllowedForMachine(machine, inlineKey) {
  const key = norm(inlineKey);
  if (!key) return false;
  const type = machineType(machine);
  if (type.includes("digital")) return key === "numerado";
  return machineSupportsInline(machine);
}

function availableInlineSlotsForMachine(machine) {
  return INLINE_PRINT_SLOTS.filter((slot) => inlineFinishAllowedForMachine(machine, slot.key));
}

function machineAllowsAnyInline(machine) {
  return availableInlineSlotsForMachine(machine).length > 0;
}

function numberingTypeOptions() {
  return [
    { id: "Numeracion Aleatoria", nombre: "Numeración Aleatoria" },
    { id: "Numeracion Consecutiva", nombre: "Numeración Consecutiva" },
    { id: "Codigo de Barras", nombre: "Código de Barras" },
    { id: "Codigo QR", nombre: "Código QR" }
  ];
}

function normalizeNumberingType(value = "", rangeFrom = "", rangeTo = "") {
  const raw = String(value || "").trim();
  const token = norm(raw);
  if (!token && !rangeFrom && !rangeTo) return "";
  if (token.includes("qr")) return "Codigo QR";
  if (token.includes("barra")) return "Codigo de Barras";
  if (token.includes("aleat")) return "Numeracion Aleatoria";
  if (token.includes("consec") || rangeFrom || rangeTo) return "Numeracion Consecutiva";
  return raw;
}

function isConsecutiveNumbering(value = "") {
  return normalizeNumberingType(value) === "Numeracion Consecutiva";
}

function buildNumberingConfig(raw = {}, inline = {}) {
  const numberingType = String(first(
    inline.numberingType,
    raw["REQ | Numeracion Tipo"],
    raw["REQ | Numeracion"],
    raw["ACABADOS | NUMERADO DETALLE"],
    raw.NUMERADO,
    ""
  ) || "").trim();
  const detail = String(first(
    inline.detail,
    raw["REQ | Numeracion Detalle"],
    raw["REQ | Numeracion Resumen"],
    raw["BOT | Numeracion Detalle"],
    inline.comment,
    ""
  ) || "").trim();
  const rangeFrom = String(first(inline.rangeFrom, raw["REQ | Numeracion Desde"], raw["BOT | Numeracion Desde"], "") || "").trim();
  const rangeTo = String(first(inline.rangeTo, raw["REQ | Numeracion Hasta"], raw["BOT | Numeracion Hasta"], "") || "").trim();
  const normalizedType = normalizeNumberingType(numberingType, rangeFrom, rangeTo);
  return {
    numberingType: normalizedType,
    isQr: /qr/i.test(normalizedType),
    rangeFrom,
    rangeTo,
    attachmentName: String(first(inline.attachmentName, raw["REQ | Numeracion Adjunto"], raw["BOT | Numeracion Adjunto"], "") || "").trim(),
    attachments: normalizeNumberingAttachments(inline),
    detail
  };
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

function materialRequiresPremier(material) {
  const surface = norm(first(material?.surfaceType, material?.tipo_superficie, ""));
  const haystack = norm(`${material?.id || ""} ${material?.name || ""} ${material?.displayName || ""} ${material?.familiaProceso || ""}`);
  return Boolean(material?.requiresPremier || material?.requiere_premier)
    || surface.includes("no_poroso")
    || surface.includes("no poroso")
    || ["bopp", "opp", "pet", "pe", "metaliz"].some((token) => haystack.includes(token));
}

function materialPremierPreapplied(material) {
  return Boolean(material?.premierPreapplied || material?.premier_preaplicado);
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
  const directSheetCost = n(first(material?.costoPorLamina, material?.costo_x_lamina, material?.costPerSheetUsd), 0);
  if (directSheetCost > 0) return directSheetCost;
  const areaIn2 = materialSheetAreaIn2(material);
  const costPerIn2 = n(first(material?.costPerSquareInchUsd, material?.costo_x_in2), 0);
  if (areaIn2 > 0 && costPerIn2 > 0) return r(areaIn2 * costPerIn2, 4);
  const costPerM2 = n(first(material?.costo_x_m2, material?.costPerSquareMeterUsd), 0);
  if (areaIn2 > 0 && costPerM2 > 0) return r((areaIn2 / 1550.0031) * costPerM2, 4);
  const costPerFt2 = n(first(material?.costo_x_ft2, material?.costoPorFt2), 0);
  if (areaIn2 > 0 && costPerFt2 > 0) return r((areaIn2 / 144) * costPerFt2, 4);
  return 0;
}

function crcToUsdRate() {
  const rows = (() => {
    try {
      return JSON.parse(state.config?.general?.proformaCurrenciesJson || "[]");
    } catch (error) {
      return [];
    }
  })();
  const usd = Array.isArray(rows) ? rows.find((item) => String(item?.code || "").toUpperCase() === "USD") : null;
  const rate = Number(usd?.exchangeRate || 0);
  return rate > 0 ? rate : 0.0019;
}

function materialCostPerIn2(material) {
  const direct = n(first(material?.costPerSquareInchUsd, material?.costo_x_in2, material?.costoPorIn2), 0);
  if (direct > 0) return direct;
  const sheetArea = materialSheetAreaIn2(material);
  const sheetCost = materialSheetCost(material);
  if (sheetArea > 0 && sheetCost > 0) return r(sheetCost / sheetArea, 6);
  const costPerMsi = n(first(material?.costoMaterialPorMsi, material?.costo_x_msi), 0);
  if (costPerMsi > 0) return r(costPerMsi / 1000, 6);
  const costPerFt2 = n(first(material?.costo_x_ft2, material?.costoPorFt2), 0);
  if (costPerFt2 > 0) return r(costPerFt2 / 144, 6);
  const costPerM2 = n(first(material?.costo_x_m2, material?.costPerSquareMeterUsd), 0);
  if (costPerM2 > 0) return r(costPerM2 / 1550.0031, 6);
  const unitCost = n(first(material?.costo_x_unidad, material?.costoPorUnidad), 0);
  if (sheetArea > 0 && unitCost > 0) return r(unitCost / sheetArea, 6);
  if (unitCost > 1000) return r((unitCost * crcToUsdRate()) / 1550.0031, 6);
  return 0;
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

function substrateMaterialOptions() {
  return materialsByClassification("sustrato", ["sustrato", "papel", "film", "bopp", "opp", "pet", "vinil"]);
}

function conventionalInkMaterialOptions() {
  return materialsByClassification("tinta", ["tinta", "ink", "uv", "ue"]);
}

function whiteInkMaterialOptions() {
  const options = conventionalInkMaterialOptions();
  const preferred = options.filter((item) => norm(`${item.descripcion || ""} ${item.nombre || ""}`).includes("blanc"));
  return preferred.length ? preferred : options;
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
  if (costMsi <= 0) {
    const costPerKg = n(first(material?.costo_x_kg, material?.costPerKgUsd), 0);
    const costPerLb = n(first(material?.costo_x_libra, material?.costoPorLibra, material?.costPerLbUsd), 0);
    if (costPerKg > 0 || costPerLb > 0) {
      return {
        costMsi: 0,
        costPerFoot: 0,
        costPerMeter: 0
      };
    }
  }
  return {
    costMsi: r(costMsi, 6),
    costPerFoot: r(costPerInch * 12, 6),
    costPerMeter: r(costPerInch / 0.0254, 6)
  };
}

function findDie(code) {
  return (state.catalogs.troqueles || []).find((item) => [item.id, item.codigo, item.codigoTroquel].some((value) => String(value || "") === String(code || ""))) || null;
}

function dieShapeToken(value = "") {
  const token = norm(value);
  if (token.includes("circul") || token.includes("redond")) return "circular";
  if (token.includes("oval")) return "ovalado";
  if (token.includes("cuadr")) return "cuadrado";
  if (token.includes("rect")) return "rectangular";
  if (token.includes("especial")) return "especial";
  return token;
}

function dimensionsMatch(widthA, lengthA, widthB, lengthB, tolerance = 0.015) {
  const aWidth = n(widthA, 0);
  const aLength = n(lengthA, 0);
  const bWidth = n(widthB, 0);
  const bLength = n(lengthB, 0);
  if (aWidth <= 0 || bWidth <= 0) return false;
  if (aLength <= 0 || bLength <= 0) return Math.abs(aWidth - bWidth) <= tolerance;
  const direct = Math.abs(aWidth - bWidth) <= tolerance && Math.abs(aLength - bLength) <= tolerance;
  const rotated = Math.abs(aWidth - bLength) <= tolerance && Math.abs(aLength - bWidth) <= tolerance;
  return direct || rotated;
}

function recommendedDieForCurrentForm() {
  if (String(state.form?.troquel?.dieCode || "").trim()) return null;
  const raw = state.context?.calculo?.raw_data || {};
  const targetShape = dieShapeToken(first(state.form?.troquel?.dieShape, raw["REQ | Forma"], state.context?.calculo?.dieShape, ""));
  const targetWidth = n(first(state.form?.header?.labelWidthIn, state.form?.troquel?.widthIn), 0);
  const targetLength = n(first(state.form?.header?.labelHeightIn, state.form?.troquel?.lengthIn), 0);
  if (!targetWidth || !targetLength) return null;
  return (state.catalogs.troqueles || []).find((die) => {
    const metricsValue = resolveDieMetrics(die, {});
    const shape = dieShapeToken(metricsValue.dieShape);
    const shapeOk = !targetShape || !shape || targetShape === shape;
    return shapeOk && dimensionsMatch(targetWidth, targetLength, metricsValue.widthIn, metricsValue.lengthIn);
  }) || null;
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
  const limited = normalized.slice(0, 6);
  if (!limited.length) return [{ id: "qty-1", value: 0 }];
  return limited;
}

function currentQuantity(form = state.form) {
  const selected = normalizeQuantities(form.header.quantities).find((item) => n(item.value, 0) > 0);
  return Math.max(0, n(selected?.value, 0));
}

function requestedQuantitiesFromRaw(raw = {}) {
  const tokens = []
    .concat(String(first(raw["REQ | Cantidades"], raw["REQ | Grupo de Cantidades"], "")).split(","))
    .concat(String(first(raw["REQ | Cantidad Solicitada Original"], "")).split(","))
    .map((item) => n(String(item || "").replace(/[^\d.,-]/g, "").trim(), 0))
    .filter((value) => value > 0);
  return [...new Set(tokens)];
}

function syncDerivedHeaderAndPackaging(form = state.form) {
  form.header.quantity = currentQuantity(form);
  form.packaging.rollCount = metrics(form).rollCount;
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
  const virgin = form?.plates?.virgin || {};
  const troquel = form?.troquel || {};
  const totalColors = Math.max(0, effectiveColors(form));
  const mountWidthIn = numericValue(first(troquel.mountWidthIn, troquel.widthIn, form?.header?.labelWidthIn), 0);
  const mountLengthIn = numericValue(first(troquel.mountLengthIn, troquel.lengthIn, form?.header?.labelHeightIn), 0);
  const marginIn = numericValue(first(laser.safetyMarginIn, 0.5), 0.5);
  const elongationPct = numericValue(troquel.elongationPct, 0);
  const elongation = elongationPct > 0 ? elongationFactor(elongationPct) : 1;
  const realWidthIn = mountWidthIn > 0 ? r(mountWidthIn + marginIn, 4) : 0;
  const realLengthIn = mountLengthIn > 0 && elongation > 0 ? r((mountLengthIn * elongation) + marginIn, 4) : 0;
  const areaPerColor = realWidthIn > 0 && realLengthIn > 0 ? r(realWidthIn * realLengthIn, 4) : 0;
  const totalArea = totalColors > 0 ? r(areaPerColor * totalColors, 4) : 0;
  const stock = findMaterial(first(virgin.materialId, laser.materialId));
  const sheetWidthIn = materialSheetWidthIn(stock);
  const sheetLengthIn = materialSheetLengthIn(stock);
  const sheetAreaIn2 = materialSheetAreaIn2(stock);
  const sheetCost = materialSheetCost(stock);
  const costPerIn2 = materialCostPerIn2(stock);
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
    elongationPct: false,
    totalColors: totalColors <= 0,
    sheetAreaIn2: sheetAreaIn2 <= 0,
    sheetCost: costPerIn2 <= 0
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
  const capacity = getQuantityCapacity();
  const quantities = normalizeQuantities(state.form.header.quantities).slice(0, capacity);
  state.form.header.quantities = quantities;
  state.form.header.quantity = currentQuantity(state.form);
  const lockedByFrontBackGroup = isFrontBackElementContext();
  const addIcon = iconPresentation("quantityAdd", "+", "#738196", 18);
  const deleteIcon = iconPresentationAny(["quantity.delete", "quantityDelete", "icons.quantity.delete"], "/calculo-flexografia/icons/trash.svg", "#b6425f", 18);
  els.quantityRepeater.innerHTML = `<div class="quantity-row">${quantities.map((item, index) => {
    const isLast = index === quantities.length - 1;
    const canAdd = isLast && quantities.length < capacity && !lockedByFrontBackGroup;
    const canRemove = isLast && quantities.length > 1 && !lockedByFrontBackGroup;
    const displayValue = item.value ? formatInteger(item.value) : "";
    const chipChars = Math.max(4, displayValue.length || 4);
    return `<div class="quantity-card${isLast ? " is-last" : ""}" style="--qty-chars:${chipChars};">
      <div class="quantity-input-group">
        <input type="text" inputmode="numeric" data-quantity-index="${index}" aria-label="Cantidad ${index + 1}" value="${esc(displayValue)}"${lockedByFrontBackGroup ? ' readonly title="Cantidad definida por la línea grupo frente/dorso"' : ""}>
        ${isLast ? `<button type="button" class="quantity-inline-action quantity-inline-add qty-add-chip" data-action="add-quantity" data-index="${index}" aria-label="Agregar cantidad después de la cantidad ${index + 1}" title="Agregar cantidad" style="--quantity-add-icon-color:${esc(addIcon.color)};--quantity-add-icon-hover:${esc(addIcon.hover)};--quantity-add-icon-size:${addIcon.size}px;"${canAdd ? "" : " disabled"}>${renderIconMarkup(addIcon.value, "Agregar cantidad", "quantity-add-icon")}</button>` : ""}
      </div>
      ${isLast ? `<button type="button" class="quantity-trash-button" data-action="remove-quantity" data-index="${index}" aria-label="Eliminar cantidad ${index + 1}" title="Eliminar cantidad" style="--delete-icon-color:${esc(deleteIcon.color)};--delete-icon-hover:${esc(deleteIcon.hover)};--delete-icon-size:${deleteIcon.size}px;"${canRemove ? "" : " disabled"}>${renderIconMarkup(deleteIcon.value, "Eliminar cantidad", "quantity-trash-icon")}</button>` : ""}
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
  return `<div class="metric-cell"><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function summaryRowWithInfo(label, value, infoTitle, infoBody) {
  return `<div class="summary-row"><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function metricBox(label, value, missing = false, alert = false) {
  return `<div class="metric-cell${missing ? " metric-cell-required" : ""}${alert ? " metric-cell-alert" : ""}"><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function infoPopoverButton(title, body, extraClass = "") {
  if (!title && !body) return "";
  const icon = first(state.config?.icons?.fieldInfo, state.config?.icons?.formulaInfo, "i");
  const iconColor = first(state.config?.general?.iconColorFieldInfo, state.config?.general?.iconColorFormulaInfo, "#4f6f8f");
  const iconSize = Number(first(state.config?.general?.iconSizeFieldInfo, state.config?.general?.iconSizeFormulaInfo, 13)) || 13;
  const className = ["info-popover-trigger", extraClass].filter(Boolean).join(" ");
  return `<button type="button" class="${className}" style="--info-icon-color:${esc(iconColor)};--info-icon-size:${esc(iconSize)}px;" aria-label="${esc(title || "Información")}" aria-expanded="false" aria-haspopup="dialog" data-info-title="${esc(title || "Información")}" data-info-body="${esc(body || "")}">${renderIconMarkup(icon, title || "Información", "info-popover-icon")}</button>`;
}

function formatDisplayNumber(value, { prefix = "", suffix = "", maximumFractionDigits = 2, integer = false, currency = false } = {}) {
  const display = currency ? money(value) : (integer ? formatInteger(value) : num(value, maximumFractionDigits));
  return `${currency || !prefix ? "" : `${prefix} `}${display}${suffix ? ` ${suffix}` : ""}`.trim();
}

function displayInput(scope, field, value, options = {}) {
  const {
    step = "0.01",
    prefix = "",
    suffix = "",
    maximumFractionDigits = 2,
    integer = false,
    currency = false,
    inputValue = value,
    displayValue = value
  } = options;
  const formattedDisplayValue = formatDisplayNumber(displayValue, { prefix, suffix, maximumFractionDigits, integer, currency });
  const unitClass = [prefix ? "has-prefix" : "", suffix ? "has-suffix" : "", currency ? "has-currency" : ""].filter(Boolean).join(" ");
  return `<div class="display-input-wrap ${unitClass}"><input class="display-input" data-scope="${esc(scope)}" data-field="${esc(field)}" type="number" step="${esc(step)}" value="${esc(inputValue)}"><span class="display-input-mask">${esc(formattedDisplayValue)}</span></div>`;
}

function readonlyDisplay(value) {
  return `<div class="display-input-wrap readonly-display"><input class="display-input" type="text" value="${esc(value)}" readonly tabindex="-1"><span class="display-input-mask">${esc(value)}</span></div>`;
}

function syncHeaderUnitMasks() {
  const updateMask = (input, mask, suffix, decimals = 3) => {
    if (!input || !mask) return;
    const rawValue = String(input.value ?? "").trim();
    if (!rawValue) {
      mask.textContent = "";
      return;
    }
    mask.textContent = `${num(n(rawValue, 0), decimals)} ${suffix}`;
  };
  updateMask(els.labelWidthIn, els.labelWidthInDisplay, "in");
  updateMask(els.labelHeightIn, els.labelHeightInDisplay, "in");
  updateMask(els.rollWidthIn, els.rollWidthInDisplay, "in");
  updateMask(els.coreDiameter, els.coreDiameterDisplay, "in");
  if (els.labelsPerRollDisplay) {
    const rawValue = String(els.labelsPerRoll?.value ?? "").trim();
    els.labelsPerRollDisplay.textContent = rawValue ? formatInteger(rawValue) : "";
  }
}

function normalizeVisibleFieldLabels(root = document) {
  root.querySelectorAll("label > span:first-child").forEach((label) => {
    const text = String(label.textContent || "").replace(/\s+/g, " ").trim();
    if (text === "Costo por in²") label.textContent = "Costo";
  });
}

function setRequiredState(node, missing) {
  if (!node) return;
  node.classList.toggle("field-required-input", Boolean(missing));
  const wrap = node.closest?.(".display-input-wrap");
  if (wrap) wrap.classList.toggle("field-required-wrap", Boolean(missing));
}

function setWarningState(node, warning) {
  if (!node) return;
  node.classList.toggle("field-warning-input", Boolean(warning));
  const wrap = node.closest?.(".display-input-wrap");
  if (wrap) wrap.classList.toggle("field-warning-wrap", Boolean(warning));
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

function markWarningScoped(scope, field, warning) {
  document.querySelectorAll(`[data-scope="${scope}"][data-field="${field}"]`).forEach((node) => setWarningState(node, warning));
}

function clearRequiredHighlights() {
  document.querySelectorAll(".field-required-input").forEach((node) => node.classList.remove("field-required-input"));
  document.querySelectorAll(".field-required-wrap").forEach((node) => node.classList.remove("field-required-wrap"));
  document.querySelectorAll(".field-warning-input").forEach((node) => node.classList.remove("field-warning-input"));
  document.querySelectorAll(".field-warning-wrap").forEach((node) => node.classList.remove("field-warning-wrap"));
}

function uniqueMessages(messages = []) {
  return [...new Set((Array.isArray(messages) ? messages : []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function summarizeMessages(messages = [], limit = 2) {
  const clean = uniqueMessages(messages);
  if (!clean.length) return "";
  if (clean.length <= limit) return clean.join(" ");
  return `${clean.slice(0, limit).join(" ")} +${clean.length - limit} más.`;
}

function resolvePrimaryValidationProcessKey() {
  const orderedKeys = sortActiveProcessKeys(state.form?.activeProcessKeys || []).filter((key) => isProcessAllowedForCurrentFrontBackContext(key));
  if (orderedKeys.includes("impresion")) {
    const firstStage = activePrintStages()[0];
    if (firstStage) return `impresion-${firstStage.id || 1}`;
  }
  return orderedKeys[0] || "troquel";
}

function buildCalculationValidationState(result = totals()) {
  const form = state.form || {};
  const alerts = {};
  const issues = [];
  const blockingMessages = [];
  const primaryTarget = resolvePrimaryValidationProcessKey();
  const packagingTarget = hasActiveProcess("empaque") ? "empaque" : primaryTarget;
  const addIssue = (processKey, message) => {
    const text = String(message || "").trim();
    if (!processKey || !text) return;
    if (!isProcessAllowedForCurrentFrontBackContext(processKey)) return;
    if (!Array.isArray(alerts[processKey])) alerts[processKey] = [];
    if (!alerts[processKey].includes(text)) alerts[processKey].push(text);
    if (!blockingMessages.includes(text)) blockingMessages.push(text);
    if (!issues.some((item) => item.processKey === processKey && item.message === text)) {
      issues.push({ processKey, message: text });
    }
  };
  const addWhen = (processKey, condition, message) => {
    if (condition) addIssue(processKey, message);
  };

  addWhen("troquel", n(form.header?.labelWidthIn, 0) <= 0, "Falta ancho de etiqueta.");
  addWhen("troquel", n(form.header?.labelHeightIn, 0) <= 0, "Falta largo de etiqueta.");
  addWhen("troquel", n(form.header?.rollWidthIn, 0) <= 0, "Falta ancho de material.");
  addWhen("troquel", n(form.header?.coreDiameter, 0) <= 0, "Falta diámetro de core.");
  addWhen("troquel", n(form.header?.coreDiameter, 0) > 10, "Revisa el diámetro de core.");
  addWhen("troquel", currentQuantity(form) <= 0, "Falta cantidad a producir.");
  addWhen("troquel", n(form.header?.quantityTypes, 0) <= 0, "Falta cantidad de tipos.");
  addWhen("troquel", !String(form.troquel?.dieCode || "").trim(), "Falta troquel.");
  addWhen(primaryTarget, !String(form.header?.applicationType || "").trim(), "Falta tipo de etiquetado.");
  addWhen(packagingTarget, n(form.header?.labelsPerRoll, 0) <= 0, "Falta etiquetas por rollo.");

  const substrateMaterial = selectedSubstrateMaterial(form);
  addWhen("sustrato", !substrateMaterial, "Falta sustrato.");
  addWhen("sustrato", substrateMaterial && n(form.substrate?.costPerFoot, 0) <= 0, "Falta costo de sustrato.");
  addWhen("planchas", !form.header?.noPrint && !hasActiveProcess("planchas"), "Falta agregar o justificar planchas.");
  addWhen("impresion", !form.header?.noPrint && !hasActiveProcess("impresion"), "Falta agregar o justificar impresión.");

  if (hasActiveProcess("diseno")) {
    addWhen("diseno", n(form.design?.artCount, 0) <= 0, "Falta cantidad de artes.");
    addWhen("diseno", n(form.design?.timePerArt, 0) <= 0, "Falta tiempo por arte.");
    addWhen("diseno", n(form.design?.hourCost, 0) <= 0, "Falta costo por hora.");
  }

  if (hasActiveProcess("preprensa")) {
    addWhen("preprensa", n(form.prepress?.artsPerHour, 0) <= 0, "Falta artes por hora.");
    addWhen("preprensa", n(form.prepress?.artCount, 0) <= 0, "Falta cantidad de artes.");
    addWhen("preprensa", n(form.prepress?.hourCost, 0) <= 0, "Falta costo por hora.");
  }

  if (hasActiveProcess("planchas")) {
    const chargePlates = form.plates?.chargePlates !== false;
    const plateMode = normalizePlateMode(form.plates?.plateMode);
    if (chargePlates && plateMode === "external") {
      const rows = normalizePlateExternalRows(form.plates.external);
      addWhen("planchas", rows.every((row) => n(row.cost, 0) <= 0), "Falta costo externo de planchas.");
    } else if (chargePlates && plateMode === "create" && processCreateEnabled("planchas")) {
      PLATE_KEYS.forEach((entry) => {
        const item = form.plates?.[entry.key] || {};
        if (entry.materialOnly && form.plates?.chargeVirginPlate !== false) {
          addWhen("planchas", !String(item.materialId || "").trim(), "Falta plancha virgen de inventario.");
          return;
        }
        addWhen("planchas", !String(item.processId || "").trim(), `Falta máquina de ${entry.label.toLowerCase()}.`);
      });
    } else if (chargePlates && plateMode !== "inventory") {
      addWhen("planchas", true, "Define planchas en inventario o costo externo de planchas.");
    }
  }

  if (hasActiveProcess("impresion")) {
    const stageWarnings = autoWarningsList();
    activePrintStages().forEach((stage, index) => {
      const key = `impresion-${stage.id || index + 1}`;
      addWhen(key, !String(stage.machineId || "").trim(), "Falta máquina de impresión.");
      addWhen(key, n(stage.setupMinutes, 0) <= 0, "Falta setup de impresión.");
      addWhen(key, n(stage.cleaningMinutes, 0) <= 0, "Falta limpieza de impresión.");
      addWhen(key, n(stage.mountingMinutes, 0) <= 0, "Falta montaje de impresión.");
      addWhen(key, n(stage.coveragePct, 0) <= 0, "Falta cobertura.");
      addWhen(key, n(stage.designCoveragePct, 0) <= 0, "Falta cobertura de diseño.");
      addWhen(key, n(stage.bcmGenerico, 0) <= 0, "Falta BCM genérico.");
      addWhen(key, n(stage.aniloxBcm, 0) <= 0, "Falta BCM anilox.");
      addWhen(key, n(stage.inkGsm, 0) <= 0, "Falta consumo de tinta.");
      addWhen(key, n(stage.transferFactor, 0) <= 0, "Falta factor de transferencia.");
      addWhen(key, n(stage.inkDensity, 0) <= 0, "Falta densidad de tinta.");
      addWhen(key, n(stage.speedMetersMin, 0) <= 0, "Falta velocidad de impresión.");
      addWhen(key, n(stage.inkCostPerLb, 0) <= 0, "Falta costo tinta CMYK.");
      addWhen(key, n(stage.whiteInkCostPerLb, 0) <= 0, "Falta costo tinta blanca.");
      addWhen(key, n(stage.pantoneInkCostPerLb, 0) <= 0, "Falta costo tinta especial.");
      addWhen(key, n(stage.availableColors, 0) <= 0, "Falta cantidad de estaciones.");
      addWhen(key, n(stage.costHour, 0) <= 0, "Falta costo hora máquina.");
      addWhen(key, n(stage.operatorHourCost, 0) <= 0, "Falta costo hora operario.");
      addWhen(key, r(n(stage.maculaSetupFeet, 0) + n(stage.maculaTirajeFeet, 0), 2) <= 0, "Falta merma de impresión.");
      const numbering = stage.inlineFinishes?.numerado;
      if (numbering?.active) {
        addWhen(key, !String(numbering.numberingType || "").trim(), "Falta tipo de numerado.");
      }
      if (index === 0) stageWarnings.forEach((warning) => addIssue(key, warning));
    });
  }

  activeExternalFinishEntries(form).forEach(({ finish, index }) => {
    const config = EXTERNAL_FINISH_BY_KEY[finish.processKey];
    if (!config) return;
    const key = `${config.key}-${index}`;
    addWhen(key, !String(finish.machineId || "").trim(), `Falta máquina de ${config.label.toLowerCase()}.`);
    addWhen(key, n(finish.setupMinutes, 0) <= 0, `Falta setup de ${config.label.toLowerCase()}.`);
    addWhen(key, n(finish.speed, 0) <= 0, `Falta velocidad de ${config.label.toLowerCase()}.`);
    addWhen(key, n(first(finish.costHourMachine, finish.costHour), 0) <= 0, `Falta costo máquina de ${config.label.toLowerCase()}.`);
    addWhen(key, n(finish.costHourOperator, 0) <= 0, `Falta costo operario de ${config.label.toLowerCase()}.`);
    if (config.usesMaterial) {
      addWhen(key, !String(finish.materialId || "").trim(), `Falta material de ${config.label.toLowerCase()}.`);
      if (config.usesWeightMaterial) {
        addWhen(key, n(finish.layerGft2, 0) <= 0, `Falta consumo de ${config.label.toLowerCase()}.`);
        addWhen(key, n(finish.costPerKg, 0) <= 0, `Falta costo por kg de ${config.label.toLowerCase()}.`);
      } else if (config.usesUnitMaterial) {
        addWhen(key, n(finish.costPerUnit, 0) <= 0, `Falta costo por unidad de ${config.label.toLowerCase()}.`);
      } else {
        addWhen(key, n(finish.costPerFt2, 0) <= 0, `Falta costo material de ${config.label.toLowerCase()}.`);
      }
    }
    if (config.usesPlateCost && !isOptionalPlateCostProcess(finish.processKey)) {
      addWhen(key, n(finish.plateCost, 0) <= 0, `Falta costo de plancha de ${config.label.toLowerCase()}.`);
    }
  });

  if (hasActiveProcess("empaque")) {
    addWhen("empaque", n(form.packaging?.rollCount, 0) <= 0, "Falta cantidad de rollos.");
    addWhen("empaque", n(form.packaging?.yieldPerHour, 0) <= 0, "Falta rendimiento por hora.");
    addWhen("empaque", n(form.packaging?.operators, 0) <= 0, "Falta cantidad de operarios.");
    addWhen("empaque", n(form.packaging?.hourCost, 0) <= 0, "Falta costo hora operario.");
  }

  return {
    alerts,
    issues,
    blockingMessages,
    hasBlockingIssues: blockingMessages.length > 0,
    summaryText: summarizeMessages(blockingMessages, 3)
  };
}

function clearProcessCardAlerts(root = els.processSections) {
  if (!root) return;
  root.querySelectorAll(".process-card").forEach((cardNode) => {
    cardNode.querySelectorAll(".process-summary-alert").forEach((node) => node.remove());
  });
}

function applyProcessCardAlerts(validationState = state.processValidation, root = els.processSections) {
  if (!root) return;
  clearProcessCardAlerts(root);
  const alerts = validationState?.alerts || {};
  root.querySelectorAll(".process-card").forEach((cardNode) => {
    const processKey = String(cardNode.dataset.processKey || "").trim();
    const messages = uniqueMessages(alerts[processKey]);
    if (!messages.length) return;
    const summaryMain = cardNode.querySelector(".process-summary-main");
    if (!summaryMain) return;
    const alertNode = document.createElement("span");
    alertNode.className = "process-summary-alert";
    alertNode.textContent = summarizeMessages(messages, 2);
    summaryMain.appendChild(alertNode);
  });
}

function updateCalculationActionState(validationState = state.processValidation) {
  const blocked = Boolean(validationState?.hasBlockingIssues);
  if (els.sapPreviewSendButton) {
    els.sapPreviewSendButton.disabled = blocked;
    els.sapPreviewSendButton.title = blocked ? (validationState.summaryText || "Completa la información faltante antes de continuar.") : "Enviar";
  }
}

function refreshCalculationValidation(result = null) {
  const totalsResult = result || totals();
  const validationState = buildCalculationValidationState(totalsResult);
  state.processValidation = validationState;
  applyRequiredHighlights(totalsResult);
  applyProcessCardAlerts(validationState);
  updateCalculationActionState(validationState);
  return validationState;
}

function ensureCalculationReadyForOutput(validationState = null) {
  const current = validationState || state.processValidation || refreshCalculationValidation();
  if (current?.hasBlockingIssues) {
    throw new Error(current.summaryText || "Completa la información faltante antes de continuar.");
  }
  return current;
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
  const substrateMaterial = selectedSubstrateMaterial(form);
  markRequiredScoped("substrate", "materialId", !substrateMaterial);
  markRequiredScoped("substrate", "costPerFoot", Boolean(substrateMaterial) && n(form.substrate?.costPerFoot, 0) <= 0);

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
    const chargePlates = form.plates?.chargePlates !== false;
    const plateMode = normalizePlateMode(form.plates?.plateMode);
    if (chargePlates && plateMode === "external") {
      normalizePlateExternalRows(form.plates.external).forEach((row, index) => {
        markRequiredScoped(`plates.external.${index}`, "cost", n(row.cost, 0) <= 0);
      });
    } else if (chargePlates && plateMode === "create" && processCreateEnabled("planchas")) {
      PLATE_KEYS.forEach((entry) => {
        const item = form.plates?.[entry.key] || {};
        if (entry.materialOnly && form.plates?.chargeVirginPlate !== false) {
          markRequiredScoped(`plates.${entry.key}`, "materialId", !String(item.materialId || "").trim());
        }
        if (!entry.materialOnly) markRequiredScoped(`plates.${entry.key}`, "processId", !String(item.processId || "").trim());
      });
    }
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
      markRequiredScoped(scope, "maculaSetupFeet", r(n(stage.maculaSetupFeet, 0) + n(stage.maculaTirajeFeet, 0), 2) <= 0);
      const numbering = stage.inlineFinishes?.numerado;
      if (numbering?.active) {
        markRequiredScoped(`${scope}.inlineFinishes.numerado`, "numberingType", !String(numbering.numberingType || "").trim());
      }
      const emboss = stage.inlineFinishes?.embosado;
      markWarningScoped(`${scope}.inlineFinishes.embosado`, "plateCost", Boolean(emboss?.active) && n(emboss.plateCost, 0) <= 0);
    });
  }

  activeExternalFinishEntries(form).forEach(({ finish, index }) => {
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
    if (config.usesPlateCost && !isOptionalPlateCostProcess(finish.processKey)) {
      markRequiredScoped(scope, "plateCost", n(finish.plateCost, 0) <= 0);
    } else if (config.usesPlateCost && isOptionalPlateCostProcess(finish.processKey)) {
      markWarningScoped(scope, "plateCost", n(finish.plateCost, 0) <= 0);
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

function formulaValue(value, maximumFractionDigits = 2) {
  return num(value, maximumFractionDigits);
}

function formula(title, body, explanation, options = {}) {
  return `<div class="process-info-anchor">${formulaButton(title, body, explanation, options)}</div>`;
}

function formulaButton(title, body, explanation, options = {}) {
  const formulaText = body ? `Fórmula: ${body}` : "";
  const explanationText = explanation ? `Explicación: ${explanation}` : "";
  const exampleLines = Array.isArray(options.exampleLines) ? options.exampleLines.filter(Boolean) : [];
  const answerText = String(options.answer || "").trim();
  const exampleText = exampleLines.length ? ["Ejemplo Actual:", ...exampleLines].join("\n") : "";
  const fullText = [formulaText, explanationText, exampleText, answerText].filter(Boolean).join("\n\n");
  return infoPopoverButton(title, fullText, "formula-help");
}

function liftFormulaInfo(body = "") {
  const html = String(body || "");
  const start = html.indexOf('<div class="process-info-anchor">');
  if (start < 0) return { body: html, info: "" };
  const close = html.indexOf("</div>", start);
  if (close < 0) return { body: html, info: "" };
  const open = '<div class="process-info-anchor">'.length;
  return {
    body: `${html.slice(0, start)}${html.slice(close + 6)}`,
    info: html.slice(start + open, close)
  };
}

function issueList(title, issues = []) {
  if (!Array.isArray(issues) || !issues.length) return "";
  return `<div class="formula-issues"><strong>${esc(title)}</strong><ul>${issues.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`;
}

function card(processKey, title, subtitle, subtotal, body, options = {}) {
  const { open = false, removable = false, removeType = "", removeIndex = "" } = options;
  const lifted = liftFormulaInfo(body || "");
  const deleteIcon = getProcessDeleteIconConfig();
  const subtotalMarkup = subtotal === null || subtotal === undefined || subtotal === "" ? "" : `<em>${money(subtotal)}</em>`;
  return `<details class="process-card" data-process-key="${esc(processKey)}"${open ? " open" : ""}><summary><div class="process-summary-main"><strong>${title}</strong><span>${esc(subtitle)}</span></div><div class="process-summary-side">${subtotalMarkup}${lifted.info}</div></summary><div class="process-body">${lifted.body}</div>${removable ? `<button type="button" class="process-remove-button" data-action="remove-process" data-remove-type="${esc(removeType)}" data-remove-index="${esc(removeIndex)}" aria-label="Eliminar proceso" title="Eliminar proceso" style="--process-delete-icon-color:${esc(deleteIcon.primary)};--process-delete-icon-hover:${esc(deleteIcon.hover)};--process-delete-icon-size:${deleteIcon.size}px;">${renderIconMarkup(deleteIcon.value, "Eliminar proceso", "process-delete-icon")}</button>` : ""}</details>`;
}

function subprocessCard(openKey, titleMarkup, subtotal, body, extraClass = "", defaultOpen = false) {
  const classes = ["subprocess-card", extraClass].filter(Boolean).join(" ");
  const restoredOpen = Object.prototype.hasOwnProperty.call(state.processOpen, openKey)
    ? Boolean(state.processOpen[openKey])
    : defaultOpen;
  const lifted = liftFormulaInfo(body || "");
  return `<details class="${classes}" data-open-key="${esc(openKey)}"${restoredOpen ? " open" : ""}><summary class="subprocess-summary"><strong>${titleMarkup}</strong><span class="subprocess-summary-side"><em>${money(subtotal)}</em>${lifted.info}</span></summary><div class="process-body subprocess-body">${lifted.body}</div></details>`;
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
  const items = activePrintStages().map((stage) => applyStageMaculaOverrides(stage, resolvePrintMacula(base, inlineItemsForMacula(stage)), base));
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
  if (requiresWaste && startupWasteFeet <= 0) issues.push("Falta Merma activa para completar la longitud total.");
  if (requiresTime && speedFtMin <= 0 && speedMMin <= 0) issues.push("Falta Velocidad de Operación.");
  if (requiresTime && setupAdjustmentMin <= 0) issues.push("Falta Tiempo de Montaje y Ajuste.");
  return issues;
}

function substrateUnitCost(form = state.form, base = metrics(form)) {
  return selectedSubstrateMaterial(form) ? n(form.substrate?.costPerFoot, 0) : 0;
}

function substrateConsumptionValue(form = state.form, base = metrics(form)) {
  return base.linealFeet;
}

function selectedSubstrateMaterial(form = state.form) {
  const materialId = String(form?.substrate?.materialId || "").trim();
  return materialId ? findMaterial(materialId) : null;
}

function syncSubstratePricingWithMaterial(form = state.form) {
  if (!form?.substrate) return;
  if (selectedSubstrateMaterial(form)) return;
  form.substrate.materialId = "";
  form.substrate.costPerFoot = 0;
  form.substrate.costPerMeter = 0;
  form.substrate.costPerMsi = 0;
}

function buildForm() {
  const context = state.context?.calculo || null;
  const quote = state.context?.cotizacion || null;
  const savedUi = context?.uiState || null;
  const raw = context?.raw_data || {};
  const autoSelection = raw?.Seleccion_Automatica || {};
  const autoPricing = raw?.Precio_Automatico || {};
  const autoProcesses = Array.isArray(context?.processes) && context.processes.length
    ? context.processes
    : Array.isArray(raw?.Secuencia_Procesos)
      ? raw.Secuencia_Procesos
      : [];
  const die = findDie(context?.dieCode);
  const selectedQuotedMachine = findMachineByDisplayName(first(autoSelection?.machineName, context?.machineName, "")) || selectSingleMachineOrNull(printMachines());
  const printProcess = byCategory("impresion")[0] || findProcessByKeywords(["impresion"]);
  const materialId = context?.materialCode || "";
  const material = findMaterial(materialId);
  const processMsi = n(material?.costoMaterialPorMsi || material?.precioUnitarioCotizacionDol, 0);
  const typeOptions = outputTypesCatalog();
  const defaultOutputType = String(first(typeOptions[0]?.id, typeOptions[0]?.codigo, "INDIFERENTE")).toUpperCase();
  const requestedOutputType = String(first(context?.outputType, defaultOutputType)).toUpperCase();
  const outputType = typeOptions.some((item) => String(item.id || item.codigo || "").toUpperCase() === requestedOutputType) ? requestedOutputType : defaultOutputType;
  const automaticRouteRequested = norm(raw["REQ | Ruta Solicitada"]).includes("automat");
  const requestedQuantities = requestedQuantitiesFromRaw(raw);
  const frontBackGroup = normalizeFrontBackGroupData(context?.grupoFrenteDorso || context?.frontBackGroup || raw);
  const lockedGroupQuantity = frontBackGroup?.role === "elemento" ? frontBackGroupQuantity(frontBackGroup) : 0;
  const quantityProducts = lockedGroupQuantity || requestedQuantities[0] || n(context?.quantityProducts, 0);
  const normalizedRequestedQuantities = lockedGroupQuantity ? [lockedGroupQuantity] : requestedQuantities;
  const dieMetrics = resolveDieMetrics(die || {}, context || {});
  const maculaConfig = defaultMaculaConfig();
  const inkDefaults = conventionalInkDefaults();
  const quoteDefaults = quoteDefaultsFromConfig();
  const productTypes = resolveProductTypes();

  const form = {
    header: {
      customerCode: first(quote?.customer_code, context?.customerCode),
      customerName: first(quote?.customer_name, context?.customerName),
      productType: first(context?.productType, productTypes[0], "Etiquetas"),
      jobName: first(context?.jobName, ""),
      salespersonName: first(quote?.salesperson_name, context?.salespersonName),
      workType: first(context?.orderType, "Nuevo"),
      labelWidthIn: n(context?.widthInches, 0),
      labelHeightIn: n(context?.lengthInches, 0),
      rollWidthIn: n(first(savedUi?.header?.rollWidthIn, autoSelection?.mounting?.requiredWidthInches, autoSelection?.mounting?.usedWidthInches, context?.coreWidth, context?.materialWidth, dieMetrics.materialWidthIn, context?.widthInches, quoteDefaults.rollWidth), 0),
      coreDiameter: String(first(savedUi?.header?.coreDiameter, context?.coreDiameter, quoteDefaults.coreDiameter)).trim(),
      labelsPerRoll: n(first(savedUi?.header?.labelsPerRoll, context?.labelsPerRoll, autoSelection?.labelsPerRoll), 0),
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
      quantities: normalizeQuantities((normalizedRequestedQuantities.length ? normalizedRequestedQuantities : [quantityProducts]).map((value, index) => ({ id: `qty-${index + 1}`, value }))),
      quoteCode: context?.quoteCode || quote?.quote_code || "",
      lineCode: context?.lineCode || "",
      lineStatus: context?.lineStatus || "",
      processType: context?.processType || ""
    },
    commercial: {
      overheadPct: n(first(savedUi?.commercial?.overheadPct, context?.contingencyPercent), 0),
      marginPct: n(first(savedUi?.commercial?.marginPct, context?.extraPercent, 35), 35),
      discountPct: n(first(savedUi?.commercial?.discountPct, 0), 0),
      taxPct: n(first(savedUi?.commercial?.taxPct, context?.taxPercent, autoPricing?.taxPercent, 13), 13)
    },
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
    plates: { chargePlates: true, chargeVirginPlate: false, plateMode: "", external: [{ description: "", cost: 0, comments: "", attachmentName: "" }], inventory: { materialId: "" } },
    print: (() => {
      const selectedPrintMachine = selectedQuotedMachine;
      const selectedPrintCapacity = selectedPrintMachine
        ? (primaryMachineCapacity(selectedPrintMachine, (item) => {
            const haystack = capacityHaystack(selectedPrintMachine, item);
            return haystack.includes("impresion") || haystack.includes("digital");
          }) || primaryMachineCapacity(selectedPrintMachine))
        : null;
      const digitalDefaults = digitalMachineSettings(selectedPrintMachine || {});
      const materialNeedsPremier = materialRequiresPremier(material);
      const materialPreTreated = materialPremierPreapplied(material);
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
        requiresSubstrateTreatment: materialNeedsPremier && !materialPreTreated,
        digitalBillingType: digitalDefaults.billingType,
        digitalInkCostPerKg: digitalDefaults.inkCostPerKg,
        digitalWhiteInkCostPerKg: digitalDefaults.whiteInkCostPerKg,
        digitalSpecialInkCostPerKg: digitalDefaults.specialInkCostPerKg,
        digitalClickRate: digitalDefaults.clickRate,
        digitalClickMode: digitalDefaults.clickMode,
        digitalCmykCoveragePct: digitalInkDefaults().cmykCoveragePct,
        digitalWhiteCoveragePct: digitalInkDefaults().whiteCoveragePct,
        digitalCmykGsm: digitalDefaults.cmykGsm,
        digitalWhiteGsm: digitalDefaults.whiteGsm,
        digitalWasteFactor: digitalDefaults.wasteFactor,
        digitalSpecialColors: 0,
        digitalSpecialWashCount: 0,
        digitalSpecialWashCost: digitalDefaults.specialWashCost,
        digitalPremierMode: digitalDefaults.premierMode,
        digitalPremierSetupMin: digitalDefaults.premierSetupMin,
        digitalPremierConsumptionGm2: firstPositiveNumber(material?.premierConsumptionGm2, material?.premier_consumo_g_m2, digitalInkDefaults().premierConsumptionGm2),
        digitalPremierCostPerKg: firstPositiveNumber(material?.premierCostPerKgUsd, material?.premier_costo_x_kg, digitalInkDefaults().premierCostPerKg),
        digitalPremierCostPerM2: firstPositiveNumber(material?.premierCostPerM2Usd, material?.premier_costo_x_m2, digitalInkDefaults().premierCostPerM2),
        digitalPremierOfflineCostPerMeter: digitalDefaults.premierOfflineCostPerMeter,
        digitalPremierMaintenanceCost: digitalDefaults.premierMaintenanceCost,
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
    const stock = entry.materialOnly ? (plateStockMaterials(machine?.id)[0] || plateStockMaterials()[0] || null) : null;
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
  syncDerivedHeaderAndPackaging(form);
  if (savedUi && typeof savedUi === "object") {
    stateSafeMerge(form, savedUi);
    const savedQuantities = Array.isArray(savedUi?.header?.quantities) ? savedUi.header.quantities : [];
    const quantitySource = savedQuantities.length ? savedQuantities : (requestedQuantities.length ? requestedQuantities : form.header.quantities);
    form.header.quantities = normalizeQuantities(quantitySource.map((item, index) => ({
      id: item?.id || `qty-${index + 1}`,
      value: typeof item === "object" ? item.value : item
    })));
    syncDerivedHeaderAndPackaging(form);
  }
  syncSubstratePricingWithMaterial(form);
  form.header.quoteCode = first(context?.quoteCode, quote?.quote_code, raw["ID COTIZACION"], form.header.quoteCode);
  form.header.lineCode = first(context?.lineCode, raw["ID LINEA"], form.header.lineCode);
  form.header.lineStatus = first(context?.lineStatus, raw["SOLICITUD ESTADO"], raw["ESTADO LINEA"], form.header.lineStatus);
  form.header.customerCode = first(quote?.customer_code, context?.customerCode, raw["ID CLIENTE"], form.header.customerCode);
  form.header.customerName = first(quote?.customer_name, context?.customerName, raw.CLIENTE, form.header.customerName);
  form.header.salespersonName = first(quote?.salesperson_name, context?.salespersonName, raw.VENDEDOR, form.header.salespersonName);
  form.plates.chargePlates = form.plates.chargePlates !== false;
  form.plates.chargeVirginPlate = false;
  form.plates.plateMode = normalizePlateMode(form.plates.plateMode);
  form.plates.external = normalizePlateExternalRows(form.plates.external);
  form.plates.inventory = form.plates.inventory && typeof form.plates.inventory === "object" ? form.plates.inventory : { materialId: "" };
  if (!String(form.plates.virgin?.materialId || "").trim() && String(form.plates.laser?.materialId || "").trim()) {
    form.plates.virgin.materialId = form.plates.laser.materialId;
  }
  if (!String(form.plates.inventory?.materialId || "").trim()) {
    form.plates.inventory.materialId = form.plates.virgin?.materialId || form.plates.laser?.materialId || "";
  }
  form.macula = {
    source: first(form.macula?.source, maculaConfig.source),
    montajeRows: normalizeMaculaMontajeRows(form.macula?.montajeRows || maculaConfig.montajeRows),
    tirajeRows: normalizeMaculaTirajeRows(form.macula?.tirajeRows || maculaConfig.tirajeRows)
  };
  form.activeProcessKeys = (form.activeProcessKeys || []).filter((key) => key !== "acabados" && !INTERNAL_PROCESS_KEYS.has(norm(key)));
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
  const inferredProcessKeys = autoProcesses
    .map((item) => processKeyFromAutoSnapshot(item?.processKey || item?.processName || item?.name || ""))
    .filter(Boolean);
  if (inferredProcessKeys.length) {
    form.activeProcessKeys = sortActiveProcessKeys((form.activeProcessKeys || []).concat(inferredProcessKeys));
  }
  if (automaticRouteRequested && inferredProcessKeys.length) {
    const inferredSet = new Set(inferredProcessKeys);
    form.activeProcessKeys = sortActiveProcessKeys((form.activeProcessKeys || []).filter((key) => {
      if (EXTERNAL_FINISH_BY_KEY[key]) return inferredSet.has(key);
      if (INLINE_PRINT_BY_KEY[key]) return inferredSet.has(key);
      return true;
    }));
    form.finishes = form.finishes.map((item) => ({
      ...item,
      active: inferredSet.has(item.processKey),
      source: item.source || "system",
      autoManaged: item.autoManaged !== false
    }));
    if (form.printStages?.[0]?.inlineFinishes) {
      Object.keys(form.printStages[0].inlineFinishes).forEach((key) => {
        form.printStages[0].inlineFinishes[key].active = inferredSet.has(key);
      });
    }
  }
  const quotedMachine = selectedQuotedMachine || findMachine(form.print?.machineId);
  if (quotedMachine) {
    form.print.machineId = quotedMachine.id || "";
    form.print.machineName = machineDisplayName(quotedMachine);
  }
  const numberingProcessPresent = inferredProcessKeys.includes("numerado");
  const inlineSource = form.printStages?.[0]?.inlineFinishes || {};
  const varnishSonified = norm(raw["REQ | Barniz Zonificado"]) === "si";
  if (varnishSonified) {
    form.activeProcessKeys = sortActiveProcessKeys((form.activeProcessKeys || []).concat("barnizado"));
  }
  if (inferredProcessKeys.includes("barnizado")) {
    inlineSource.barniz = { ...(inlineSource.barniz || {}), active: machineSupportsInline(quotedMachine) };
  }
  if (varnishSonified) {
    inlineSource.barniz = {
      ...(inlineSource.barniz || {}),
      active: true,
      sonified: true,
      comment: first(inlineSource.barniz?.comment, "Zonificado")
    };
  }
  if (inferredProcessKeys.includes("laminado")) {
    inlineSource.laminado = { ...(inlineSource.laminado || {}), active: machineSupportsInline(quotedMachine) };
  }
  if (inferredProcessKeys.includes("estampado")) {
    inlineSource.estampado = { ...(inlineSource.estampado || {}), active: machineSupportsInline(quotedMachine) };
  }
  if (inferredProcessKeys.includes("embosado")) {
    inlineSource.embosado = { ...(inlineSource.embosado || {}), active: machineSupportsInline(quotedMachine) };
  }
  if (inferredProcessKeys.includes("troquelado")) {
    inlineSource.troquelado = { ...(inlineSource.troquelado || {}), active: machineSupportsInline(quotedMachine) };
  }
  if (numberingProcessPresent) {
    inlineSource.numerado = { ...(inlineSource.numerado || {}), active: true };
  }
  if (form.printStages?.[0]) {
    form.printStages[0].inlineFinishes = inlineSource;
  }
  const shouldExpand = false;
  state.form = form;
  ensureActiveProcessKeys(shouldExpand);
  ensureConfiguredProcessInstances();
  syncInlineFinishesForMachine(0);
  if (form.printStages?.[0]) {
    ["barniz", "laminado", "estampado", "embosado", "troquelado", "numerado"].forEach((inlineKey) => {
      if (form.printStages[0].inlineFinishes?.[inlineKey]?.active) {
        applyInlineFinishSetupDefaults(0, inlineKey, true);
      }
    });
  }
  syncPrimaryPrintStage();
  return form;
}

function calcTroquel() {
  const base = metrics();
  const pricing = { processKey: "troquel", rawSubtotal: 0, minimumCost: 0, minimumApplied: false, subtotal: 0 };
  return {
    ...pricing,
    labelsPerRepeat: base.labelsPerRepeat,
    development: base.development,
    formulaText: "Etiquetas por repetición = filas × repeticiones. Desarrollo del troquel = largo troquel × repeticiones.",
    explanation: "Este bloque toma el troquel seleccionado del inventario para determinar cuántas etiquetas salen por vuelta y cuál es el desarrollo real que se usará en el resto del cálculo."
  };
}

function calcMacula() {
  const macula = state.form?.macula || {};
  const montajeRows = normalizeMaculaMontajeRows(macula.montajeRows || []);
  const tirajeRows = normalizeMaculaTirajeRows(macula.tirajeRows || []);
  const pricing = applyProcessMinimum("macula", 0);
  return {
    ...pricing,
    source: first(macula.source, "convencional"),
    montajeRows,
    tirajeRows,
    montajeTotalPies: r(montajeRows.reduce((sum, row) => sum + n(row.totalPies, 0), 0), 2),
    montajeTotalEstaciones: r(montajeRows.reduce((sum, row) => sum + n(row.porEstacion, 0), 0), 2),
    tirajePromedioPct: tirajeRows.length ? r(tirajeRows.reduce((sum, row) => sum + n(row.porcentaje, 0), 0) / tirajeRows.length, 2) : 0,
    formulaText: "Merma base = parámetros de montaje y tiraje definidos en Costos. La cotización los carga como referencia editable por documento.",
    explanation: "Este bloque resume la configuración vigente de merma y la deja editable dentro de la cotización para ajustar la merma del trabajo sin cambiar la tabla maestra."
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
    .filter((item) => item.active && item.allowedForMachine !== false)
    .map((item) => normalizeMaculaProcessKey(item.key || item.label || ""))
    .filter(Boolean);
  const activeSet = new Set(["impresion", ...activeInlineKeys]);

  const setupRows = macula.montajeRows.filter((row) => normalizeMaculaProcessKey(row.detalle) === "impresion");
  const inlineSetupFeet = r(inlineItems
    .filter((item) => item.active && item.allowedForMachine !== false)
    .reduce((sum, item) => sum + n(item.setupWasteFeet, 0), 0), 2);
  const setupFeet = r(setupRows.reduce((sum, row) => sum + n(row.totalPies, 0), 0) + inlineSetupFeet, 2);

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
    inlineSetupFeet,
    tirajePct,
    tirajeFeet,
    totalFeet,
    activeInlineKeys
  };
}

function applyStageMaculaOverrides(stage = {}, macula = {}, base = metrics()) {
  const next = { ...macula };
  const hasSetupOverride = stage.maculaSetupFeet !== undefined && stage.maculaSetupFeet !== "";
  const hasTirajeFeetOverride = stage.maculaTirajeFeet !== undefined && stage.maculaTirajeFeet !== "" && n(stage.maculaTirajeFeet, 0) > 0;
  const hasTirajePctOverride = stage.maculaTirajePct !== undefined && stage.maculaTirajePct !== "" && n(stage.maculaTirajePct, 0) > 0;
  if (hasSetupOverride && n(stage.maculaSetupFeet, 0) > 0) next.setupFeet = r(n(stage.maculaSetupFeet, 0) + n(next.inlineSetupFeet, 0), 2);
  if (hasTirajePctOverride) {
    next.tirajePct = r(n(stage.maculaTirajePct, 0), 2);
    if (!hasTirajeFeetOverride) next.tirajeFeet = r(n(base.linealFeet, 0) * (n(next.tirajePct, 0) / 100), 2);
  }
  if (hasTirajeFeetOverride) next.tirajeFeet = r(n(stage.maculaTirajeFeet, 0), 2);
  next.totalFeet = r(n(next.setupFeet, 0) + n(next.tirajeFeet, 0), 2);
  return next;
}

function calcSustrato() {
  const base = metrics();
  const material = selectedSubstrateMaterial(state.form);
  const materialName = first(material?.nombre, material?.name, material?.descripcion, "");
  const macula = hasActiveProcess("impresion") ? documentMaculaFromStages(base) : { setupFeet: 0, tirajeFeet: 0, totalFeet: 0 };
  const maculaSetupFeet = r(n(macula.setupFeet, 0), 2);
  const maculaTirajeFeet = r(n(macula.tirajeFeet, 0), 2);
  const startupWasteFeet = r(macula.totalFeet, 2);
  const totalLengthFeet = r(base.linealFeet + startupWasteFeet, 2);
  const totalLengthMeters = r(totalLengthFeet * 0.3048, 4);
  const totalAreaFt2 = r(totalLengthFeet * (n(base.webWidthIn, 0) / 12), 6);
  const unitCost = substrateUnitCost(state.form, base);
  const consumption = totalLengthFeet;
  const rawSubtotal = r(consumption * unitCost);
  const pricing = applyProcessMinimum("sustrato", rawSubtotal);
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
    maculaSetupFeet,
    maculaTirajeFeet,
    maculaTotalFeet: startupWasteFeet,
    startupWasteFeet,
    totalLengthFeet,
    totalLengthMeters,
    totalAreaFt2,
    consumption,
    materialName,
    unitCost,
    unitLabel,
    unitCostLabel,
    ...pricing,
    issues,
    formulaConsumption: "Longitud Total (pies) = [ (Cantidad a Producir x Desarrollo del Cilindro) / (12 x Cantidad de Etiquetas al Través) ] + Merma Total",
    formulaArea: "Área Total Consumida (pies²) = Longitud Total (pies) x (Ancho de la Bobina / 12)",
    formulaCost: `Costo sustrato = Longitud Total en ${unitLabel} x ${unitCostLabel}`,
    explanation: "Sustrato toma la longitud neta del trabajo, le suma la merma y con eso calcula tanto la longitud total requerida como el área total consumida del material."
  };
}

function calcDesign() {
  const artCount = Math.max(1, n(state.form.header.quantityTypes, n(state.form.design.artCount, 1)));
  const changeCount = n(state.form.header.quantityChanges, 0);
  const time = r((artCount * n(state.form.design.timePerArt, 0)) + (changeCount * n(state.form.design.timePerArt, 0) * n(state.form.design.changeFactor, 0)));
  const pricing = applyProcessMinimum("diseno", r(time * n(state.form.design.hourCost, 0)));
  return { time, ...pricing, formulaText: "Tiempo Total = (Artes x Tiempo Base) + (Cambios x Tiempo Base x Factor de Cambios). Costo = Tiempo Total x Costo por Hora.", explanation: "Diseño toma la cantidad de tipos del encabezado y suma el tiempo adicional por cambios para dejar visible el costo creativo real del trabajo." };
}

function calcPrepress() {
  if (digitalPlateRuleApplies()) {
    const pricing = applyProcessMinimum("preprensa", 0);
    return {
      ...pricing,
      time: 0,
      formulaText: "Costo = 0.",
      explanation: digitalPlateRuleMessage()
    };
  }
  const artCount = Math.max(1, n(state.form.header.quantityTypes, n(state.form.prepress.artCount, 1)));
  const time = n(state.form.prepress.artsPerHour, 0) > 0 ? r(artCount / n(state.form.prepress.artsPerHour, 0)) : 0;
  const pricing = applyProcessMinimum("preprensa", r(time * n(state.form.prepress.hourCost, 0)));
  return { time, ...pricing, formulaText: "Tiempo = Artes / Rendimiento. Costo = Tiempo x Costo por Hora.", explanation: "Preprensa convierte la cantidad de tipos en horas según el rendimiento técnico configurado para esa etapa." };
}

function calcPlates() {
  if (state.form.plates?.chargePlates === false) {
    const breakdown = {};
    PLATE_KEYS.forEach((entry) => {
      breakdown[entry.key] = {
        hours: 0,
        materialSubtotal: 0,
        machineSubtotal: 0,
        operatorSubtotal: 0,
        subtotal: 0,
        formulaText: "Costo = 0.",
        explanation: "Cobro de planchas desactivado para esta cotizacion.",
        laserMetrics: ["virgin", "laser"].includes(entry.key) ? laserPlateMetrics() : null
      };
    });
    return { ...applyProcessMinimum("planchas", 0), breakdown, explanation: "Cobro de planchas desactivado para esta cotizacion." };
  }
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
    return { ...applyProcessMinimum("planchas", 0), breakdown, explanation: digitalPlateRuleMessage() };
  }
  const plateMode = normalizePlateMode(state.form.plates?.plateMode);
  if (plateMode === "external") {
    const rows = normalizePlateExternalRows(state.form.plates.external);
    state.form.plates.external = rows;
    const rawSubtotal = r(rows.reduce((sum, item) => sum + n(item.cost, 0), 0));
    return {
      ...applyProcessMinimum("planchas", rawSubtotal),
      breakdown: emptyPlateBreakdown("Costo externo de planchas registrado manualmente."),
      externalRows: rows,
      formulaText: "Subtotal planchas = suma de costos externos registrados.",
      explanation: "Costo externo toma la descripción, costo, comentarios y adjunto indicado para planchas."
    };
  }
  if (plateMode === "inventory") {
    state.form.plates.inventory = {
      ...(state.form.plates.inventory || {}),
      inInventory: true
    };
    return {
      ...applyProcessMinimum("planchas", 0),
      breakdown: emptyPlateBreakdown("Planchas marcadas como inventario."),
      inventory: state.form.plates.inventory,
      formulaText: "Costo de planchas = 0.",
      explanation: "Las planchas se tomarán de inventario y no requieren costo externo en este cálculo."
    };
  }
  if (plateMode !== "create") {
    return { ...applyProcessMinimum("planchas", 0), breakdown: emptyPlateBreakdown("Pendiente definir inventario o costo externo."), explanation: "Selecciona planchas en inventario o registra un costo externo para continuar." };
  }
  if (state.form.plates?.chargeVirginPlate === false) {
    const breakdown = {};
    PLATE_KEYS.forEach((entry) => {
      breakdown[entry.key] = {
        hours: 0,
        materialSubtotal: 0,
        machineSubtotal: 0,
        operatorSubtotal: 0,
        subtotal: 0,
        formulaText: "Costo = 0.",
        explanation: "Plancha Virgen desactivada. Si no se solicita la plancha, no se cobran sus procesos asociados.",
        laserMetrics: ["virgin", "laser"].includes(entry.key) ? laserPlateMetrics() : null
      };
    });
    return { ...applyProcessMinimum("planchas", 0), breakdown, explanation: "Plancha Virgen desactivada. No se cobra plancha ni grabado, revelado, limpieza o secado." };
  }
  let subtotal = 0;
  const breakdown = {};
  PLATE_KEYS.forEach((entry) => {
    const item = state.form.plates[entry.key];
    const laserMetricsValue = entry.key === "laser" ? laserPlateMetrics() : null;
    const virginMetricsValue = entry.key === "virgin" ? laserPlateMetrics() : null;
    if (entry.key === "virgin") state.form.plates.virgin.area = virginMetricsValue.totalArea;
    if (entry.key === "laser") state.form.plates.laser.area = laserMetricsValue.totalArea;
    const hours = entry.key === "laser" ? laserMetricsValue.totalHours : (entry.key === "virgin" ? 0 : r(n(item.fixedMinutes, 0) / 60));
    const machineSubtotal = r(hours * n(item.costHourMachine, 0));
    const operatorSubtotal = r(hours * n(item.costHourOperator, 0));
    const materialSubtotal = entry.key === "virgin" && state.form.plates.chargeVirginPlate !== false ? r(virginMetricsValue.materialSubtotal) : 0;
    const stepSubtotal = r(materialSubtotal + machineSubtotal + operatorSubtotal);
    subtotal += stepSubtotal;
    breakdown[entry.key] = {
      hours,
      materialSubtotal,
      machineSubtotal,
      operatorSubtotal,
      subtotal: stepSubtotal,
      formulaText: entry.key === "virgin" ? "Costo Plancha Virgen = Área Total Requerida x Costo por in² del inventario." : (entry.key === "laser" ? "Tiempo Total = Área Total / Área Procesada por Hora. Subtotal = Tiempo x Costo Hora Máquina + Tiempo x Costo Hora Hombre." : "Tiempo = Tiempo Fijo o por Lote. Subtotal = (Tiempo x Costo Hora Máquina) + (Tiempo x Costo Hora Hombre)."),
      explanation: entry.key === "virgin" ? "La plancha virgen se cobra como suministro independiente usando el costo por pulgada cuadrada del inventario." : (entry.key === "laser" ? "El grabado láser queda como proceso separado de la plancha virgen y solo calcula tiempo, máquina y persona." : "Este subproceso toma un tiempo fijo de operación y suma tanto el costo de máquina como el costo de la persona."),
      laserMetrics: laserMetricsValue || virginMetricsValue
    };
  });
  return { ...applyProcessMinimum("planchas", r(subtotal)), breakdown, explanation: "Planchas suma los cuatro subprocesos obligatorios y deja visible cuanto aporta cada uno al subtotal final del bloque." };
}

function calcPrint() {
  const base = metrics();
  const stages = activePrintStages();
  const items = stages.map((item) => {
    const machine = findMachine(item.machineId);
    const supportsInline = machineSupportsInline(machine);
    const isDigitalMachine = isDigitalProductionMachine(machine);
    const digitalSettings = digitalMachineSettings(machine, item);
    const digitalStations = Math.max(0, base.colors + n(item.digitalSpecialColors, 0));
    const speedMetersMin = isDigitalMachine ? digitalSpeedForStations(machine, item, digitalStations) : n(item.speedMetersMin, 0);
    const speedUnit = printSpeedUnit(machine);
    const inkCoverage = n(item.coveragePct, 0) / 100;
    const aniloxBcm = n(first(item.aniloxBcm, item.inkGsm), 0);
    const transferFactor = n(item.transferFactor, 0);
    const inkDensity = n(item.inkDensity, 0);
    const inkCostPerLb = n(item.inkCostPerLb, 0);
    const printedAreaIn2 = r((base.printedAreaFt2 || 0) * 144, 6);
    const conventionalInkConsumptionPerColorLb = state.form.header.noPrint ? 0 : r((printedAreaIn2 * inkCoverage * aniloxBcm * transferFactor * inkDensity * 0.001) / 453.59237, 6);
    const conventionalInkConsumption = state.form.header.noPrint ? 0 : r(conventionalInkConsumptionPerColorLb * base.colors, 6);
    const conventionalInkSubtotal = r(conventionalInkConsumption * inkCostPerLb);
    let inkConsumptionPerColorLb = conventionalInkConsumptionPerColorLb;
    let inkConsumption = conventionalInkConsumption;
    let inkSubtotal = conventionalInkSubtotal;
    let digitalInkKg = 0;
    let whiteKg = 0;
    let specialKg = 0;
    let digitalClickSubtotal = 0;
    let digitalWashSubtotal = 0;
    let premierSubtotal = 0;
    let premierLiquidSubtotal = 0;
    let premierProcessSubtotal = 0;
    let premierSetupSubtotal = 0;
    const inlineItems = INLINE_PRINT_SLOTS.map((slot) => {
      const inline = item.inlineFinishes?.[slot.key] || {};
      const config = externalConfigForInlineFinish(slot.key) || slot;
      const isInlineDie = config.key === "troquelado";
      const inlineAllowed = inlineFinishAllowedForMachine(machine, slot.key);
      const material = findMaterial(inline.materialId);
      const inlineOperatorHourCost = n(item.operatorHourCost, n(state.form.print.operatorHourCost, 0));
      const inlineMachineHourCost = n(first(inline.costHourMachine, item.costHour), 0);
      const inlineSpeedFtMin = n(inline.speed, 0) > 0
        ? n(inline.speed, 0)
        : (speedUnit === "m/min" ? r(n(speedMetersMin, 0) * 3.28084, 4) : n(speedMetersMin, 0));
      const baseLengthFeet = n(base.totalLengthFeet, n(base.linealFeet, 0));
      const runBase = config.key === "troquelado" && n(inline.variableBase, 0) > 0
        ? n(inline.variableBase, 0) + n(inline.setupWasteFeet, 0)
        : baseLengthFeet + n(inline.setupWasteFeet, 0);
      const runMinutes = inlineSpeedFtMin > 0 ? r(runBase / inlineSpeedFtMin) : 0;
      const totalMinutes = r(n(inline.setupMinutes, 0) + runMinutes, 6);
      const supplyWidthIn = config.usesUnitMaterial || config.usesWeightMaterial
        ? n(base.webWidthIn, 0)
        : materialSupplyWidthIn(material, base.webWidthIn);
      const wastePct = config.usesUnitMaterial ? n(inline.operationWastePct, 0) : n(first(inline.operationWastePct, materialWastePct(material)), 0);
      const netMaterialAreaFt2 = r(runBase * (supplyWidthIn / 12), 6);
      const materialAreaFt2 = r(netMaterialAreaFt2 * (1 + (wastePct / 100)), 6);
      const materialBase = config.usesUnitMaterial
        ? Math.max(0, Math.ceil(n(base.rollCount, 0)))
        : materialAreaFt2;
      const areaCostFt2 = firstPositiveNumber(inline.costPerFt2, material?.costo_x_ft2, material?.costoPorFt2, 0);
      const weightCostKg = firstPositiveNumber(inline.costPerKg, material?.costo_x_kg, 0);
      const layerGft2 = firstPositiveNumber(inline.layerGft2, material?.rendimiento_g_ft2, material?.peso_capa_gsm, 0);
      const unitCost = config.usesWeightMaterial ? weightCostKg
        : config.usesUnitMaterial ? n(inline.costPerUnit, 0)
        : areaCostFt2 > 0 ? areaCostFt2
        : state.form.substrate.unit === "metros" ? n(inline.costPerMeter, 0)
        : state.form.substrate.unit === "msi" ? n(inline.costPerMsi, 0)
        : n(inline.costPerFoot, 0);
      const setupCost = r((n(inline.setupMinutes, 0) / 60) * inlineOperatorHourCost);
      let machineSubtotal = r((totalMinutes / 60) * inlineMachineHourCost);
      let operatorSubtotal = r((totalMinutes / 60) * inlineOperatorHourCost);
      const varnishProfile = varnishProfileInfo(item);
      const varnishCoverage = n(varnishProfile.coveragePct, 100) / 100;
      const varnishGsm = n(varnishProfile.gsm, 3);
      const varnishCostPerLb = n(inline.costPerLb, materialCostPerPound(material));
      const materialConsumptionKg = config.usesWeightMaterial ? r((materialBase * layerGft2) / 1000, 6) : 0;
      const materialConsumptionLb = slot.key === "barniz" && !config.usesWeightMaterial && inline.active ? r((base.printedAreaM2 * varnishCoverage * varnishGsm) / 453.59237, 6) : 0;
      let materialSubtotal = config.usesWeightMaterial
        ? r(materialConsumptionKg * weightCostKg)
        : slot.key === "barniz"
        ? r(materialConsumptionLb * varnishCostPerLb)
        : config.usesMaterial && inline.active
          ? r(materialBase * unitCost)
          : 0;
      let plateCost = config.usesPlateCost && inline.active ? r(n(inline.plateCost, 0)) : 0;
      let linearSubtotal = isInlineDie ? r(runBase * n(inline.variableUnitCost, 0)) : 0;
      let rawSubtotal = r(machineSubtotal + operatorSubtotal + n(inline.fixedCost, 0) + linearSubtotal + materialSubtotal + plateCost);
      if (isInlineDie) {
        machineSubtotal = 0;
        operatorSubtotal = 0;
        materialSubtotal = 0;
        plateCost = 0;
        linearSubtotal = 0;
        rawSubtotal = 0;
      }
      return {
        ...slot,
        ...inline,
        ...config,
        key: slot.key,
        label: slot.label,
        materialName: material?.descripcion || material?.nombre || "",
        unitCost,
        materialBase,
        calcBase: runBase,
        runMinutes,
        totalMinutes,
        speed: inlineSpeedFtMin,
        supplyWidthIn,
        wastePct,
        netMaterialAreaFt2,
        costPerFt2: areaCostFt2,
        costPerKg: weightCostKg,
        layerGft2,
        materialConsumptionKg,
        materialConsumptionLb,
        coveragePct: slot.key === "barniz" ? n(varnishProfile.coveragePct, 100) : n(inline.coveragePct, 0),
        varnishBcm: slot.key === "barniz" ? n(varnishProfile.bcm, 0) : 0,
        layerGsm: varnishGsm,
        costPerLb: varnishCostPerLb,
        costHourMachine: inlineMachineHourCost,
        operatorHourCost: inlineOperatorHourCost,
        allowedForMachine: inlineAllowed,
        setupCost,
        machineSubtotal,
        operatorSubtotal,
        linearSubtotal,
        materialSubtotal,
        plateCost,
        rawSubtotal,
        subtotal: inline.active && inlineAllowed ? rawSubtotal : 0
      };
    });
    const inlineSubtotal = r(inlineItems.reduce((sum, inline) => sum + inline.subtotal, 0));
    const macula = applyStageMaculaOverrides(item, resolvePrintMacula(base, inlineItems), base);
    item.maculaSetupFeet = n(item.maculaSetupFeet, 0) > 0 ? item.maculaSetupFeet : macula.setupFeet;
    const startupWasteFeet = r(n(macula.totalFeet, 0), 2);
    const maculaMaterialSubtotal = r(startupWasteFeet * substrateUnitCost(state.form, base));
    const totalLengthFeet = r(base.linealFeet + startupWasteFeet, 2);
    const totalLengthMeters = r(totalLengthFeet * 0.3048, 4);
    const totalAreaFt2 = r(totalLengthFeet * (n(base.webWidthIn, 0) / 12), 6);
    const totalAreaM2 = r(totalAreaFt2 * 0.09290304, 6);
    if (isDigitalMachine) {
      const cmykStations = state.form.header.useCmyk ? 4 : 0;
      const whitePasses = state.form.header.useWhiteInk ? (state.form.header.doubleWhitePass ? 2 : 1) : 0;
      const cmykKg = state.form.header.noPrint ? 0 : r((base.printedAreaM2 * (n(item.digitalCmykCoveragePct, 0) / 100) * n(item.digitalCmykGsm, digitalSettings.cmykGsm) * Math.max(0, cmykStations / 4) * n(item.digitalWasteFactor, digitalSettings.wasteFactor)) / 1000, 6);
      whiteKg = state.form.header.noPrint ? 0 : r((base.printedAreaM2 * (n(item.digitalWhiteCoveragePct, 0) / 100) * n(item.digitalWhiteGsm, digitalSettings.whiteGsm) * whitePasses * n(item.digitalWasteFactor, digitalSettings.wasteFactor)) / 1000, 6);
      specialKg = state.form.header.noPrint ? 0 : r((base.printedAreaM2 * (n(item.digitalCmykCoveragePct, 0) / 100) * n(item.digitalCmykGsm, digitalSettings.cmykGsm) * Math.max(0, n(item.digitalSpecialColors, 0)) * n(item.digitalWasteFactor, digitalSettings.wasteFactor)) / 1000, 6);
      digitalInkKg = r(cmykKg + whiteKg + specialKg, 6);
      const billingType = String(first(item.digitalBillingType, digitalSettings.billingType)).toLowerCase();
      const billableStations = String(first(item.digitalClickMode, digitalSettings.clickMode)).toLowerCase() === "por_vuelta" ? 1 : Math.max(1, digitalStations);
      digitalClickSubtotal = billingType === "clic" ? r(base.qty * billableStations * n(item.digitalClickRate, digitalSettings.clickRate)) : 0;
      inkSubtotal = billingType === "clic"
        ? digitalClickSubtotal
        : r(
          (cmykKg * n(item.digitalInkCostPerKg, digitalSettings.inkCostPerKg))
          + (whiteKg * n(item.digitalWhiteInkCostPerKg, digitalSettings.whiteInkCostPerKg))
          + (specialKg * n(item.digitalSpecialInkCostPerKg, digitalSettings.specialInkCostPerKg))
        );
      inkConsumption = digitalInkKg;
      inkConsumptionPerColorLb = 0;
      digitalWashSubtotal = r(n(item.digitalSpecialWashCount, 0) * n(item.digitalSpecialWashCost, digitalSettings.specialWashCost));
      const material = findMaterial(state.form.substrate.materialId);
      const shouldTreat = Boolean(item.requiresSubstrateTreatment) && !materialPremierPreapplied(material);
      if (shouldTreat) {
        const premierCostPerM2 = n(item.digitalPremierCostPerM2, 0);
        const premierKg = r((totalAreaM2 * n(item.digitalPremierConsumptionGm2, 0.65)) / 1000, 6);
        premierLiquidSubtotal = premierCostPerM2 > 0
          ? r(totalAreaM2 * premierCostPerM2)
          : r(premierKg * n(item.digitalPremierCostPerKg, 0));
        premierSetupSubtotal = r((n(item.digitalPremierSetupMin, digitalSettings.premierSetupMin) / 60) * n(item.costHour, 0));
        const premierMode = String(first(item.digitalPremierMode, digitalSettings.premierMode)).toLowerCase();
        const offlineSubtotal = premierMode === "offline"
          ? r(totalLengthMeters * n(item.digitalPremierOfflineCostPerMeter, digitalSettings.premierOfflineCostPerMeter))
          : r(n(item.digitalPremierMaintenanceCost, digitalSettings.premierMaintenanceCost));
        premierProcessSubtotal = offlineSubtotal;
        premierSubtotal = r(premierLiquidSubtotal + premierSetupSubtotal + premierProcessSubtotal);
      }
    }
    const inlineSetupMinutes = r(inlineItems
      .filter((inline) => inline.active && inline.allowedForMachine !== false)
      .reduce((sum, inline) => sum + n(inline.setupMinutes, 0), 0), 2);
    const setupAdjustmentMin = r(n(item.setupMinutes, 0) + n(item.cleaningMinutes, 0) + n(item.mountingMinutes, 0) + inlineSetupMinutes, 2);
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
        availableInlineSlots: availableInlineSlotsForMachine(machine).map((slot) => slot.key),
        colors: base.colors,
        linealFeet: base.linealFeet,
        linealMeters: base.linealMeters,
        startupWasteFeet,
        totalLengthFeet,
        totalLengthMeters,
        totalAreaFt2,
        totalAreaM2,
        speedFtMin: speedUnit === "ft/min" ? speedMetersMin : 0,
        speedMMin: speedUnit === "m/min" ? speedMetersMin : 0,
        speedUnit,
        setupAdjustmentMin,
        inlineSetupMinutes,
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
        digitalStations,
        digitalInkKg,
        digitalWhiteKg: whiteKg,
        digitalSpecialInkKg: specialKg,
        digitalClickSubtotal,
        digitalWashSubtotal,
        premierSubtotal,
        premierLiquidSubtotal,
        premierProcessSubtotal,
        premierSetupSubtotal,
        inlineItems,
        macula,
        maculaMaterialSubtotal,
        issues,
        inlineSubtotal,
        subtotal: r(machineSubtotal + operatorSubtotal + inkSubtotal + digitalWashSubtotal + premierSubtotal + inlineSubtotal)
      };
  });
  const machineSubtotal = r(items.reduce((sum, item) => sum + item.machineSubtotal, 0));
  const operatorSubtotal = r(items.reduce((sum, item) => sum + item.operatorSubtotal, 0));
  const inkConsumption = r(items.reduce((sum, item) => sum + item.inkConsumption, 0));
  const inkSubtotal = r(items.reduce((sum, item) => sum + item.inkSubtotal, 0));
  const digitalWashSubtotal = r(items.reduce((sum, item) => sum + n(item.digitalWashSubtotal, 0), 0));
  const premierSubtotal = r(items.reduce((sum, item) => sum + n(item.premierSubtotal, 0), 0));
  const inlineSubtotal = r(items.reduce((sum, item) => sum + item.inlineSubtotal, 0));
  const maculaSetupFeet = r(items.reduce((sum, item) => sum + n(item.macula?.setupFeet, 0), 0), 2);
  const maculaTirajeFeet = r(items.reduce((sum, item) => sum + n(item.macula?.tirajeFeet, 0), 0), 2);
  const maculaTotalFeet = r(items.reduce((sum, item) => sum + n(item.macula?.totalFeet, 0), 0), 2);
  const totalMinutes = r(items.reduce((sum, item) => sum + item.totalMinutes, 0));
  const runMinutes = r(items.reduce((sum, item) => sum + item.runMinutes, 0));
  const pricing = applyProcessMinimum("impresion", r(machineSubtotal + operatorSubtotal + inkSubtotal + digitalWashSubtotal + premierSubtotal + inlineSubtotal));
  return { ...base, ...pricing, items, runMinutes, totalMinutes, machineSubtotal, operatorSubtotal, inkConsumption, inkSubtotal, digitalWashSubtotal, premierSubtotal, inlineSubtotal, maculaSetupFeet, maculaTirajeFeet, maculaTotalFeet, timeFormula: "Tiempo Total en Máquina (min) = (Longitud Total en pies / Velocidad de Operación en ft/min) + Tiempo de Montaje y Ajuste", inkFormula: "Consumo tinta = área impresa × cobertura × BCM anilox × factor transferencia × densidad tinta × tintas requeridas", explanation: "Impresión calcula el tiempo de corrida usando la longitud total del trabajo, incluyendo la merma, antes de sumar el tiempo de montaje y ajuste." };
}

function calcFinishes() {
  const base = calcSustrato();
  const items = activeExternalFinishEntries().map(({ finish: item, index }) => {
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
    const rawSubtotal = item.active && item.machineId ? r(machineSubtotal + operatorSubtotal + n(item.fixedCost, 0) + (runBase * n(item.variableUnitCost, 0)) + materialSubtotal + plateCost) : 0;
    const pricing = applyProcessMinimum(item.processKey, rawSubtotal);
    let formulaText = "Acabado = costo máquina + costo operador + insumos del proceso.";
    let explanation = "El acabado mantiene su montaje, corrida y costos propios.";
    if (item.processKey === "barnizado") {
      formulaText = "Barniz = costo máquina + costo operador + (Área Material ft² × (1 + Merma %) × Rendimiento g/ft² / 1 000) × Costo Kg.";
      explanation = "Barnizado usa el área técnica del trabajo, aplica la merma del barniz y convierte el depósito en g/ft² a kilogramos antes de valorizarlo.";
    } else if (item.processKey === "laminado") {
      formulaText = "Laminado = costo máquina + costo operador + (Área Material ft² × (1 + Merma %) × costo material ft²).";
      explanation = "Laminado usa el ancho real del laminado, calcula el área técnica del proceso y aplica la merma del suministro antes de valorizarlo.";
    } else if (item.processKey === "estampado") {
      formulaText = "Estampado = costo máquina + costo operador + (Área Foil ft² × (1 + Merma %) × costo foil ft²).";
      explanation = "Estampado usa el ancho real del foil y aplica su merma técnica antes de valorizar el material.";
    } else if (item.processKey === "embosado") {
      formulaText = "Embosado = costo máquina + costo operador + costo cliché.";
      explanation = "Embosado no consume material variable en esta etapa; se valora por tiempo de máquina y costo del cliché.";
    } else if (item.processKey === "troquelado") {
      formulaText = "Troquelado = costo máquina + costo operador + costo base + (base lineal × costo lineal, si aplica).";
      explanation = "Troquelado trabaja sobre la longitud total del trabajo. El costo lineal se agrega cuando se define un valor de costo por pie.";
    } else if (item.processKey === "rebobinado") {
      formulaText = "Rebobinado = costo máquina + costo operador.";
      explanation = "Rebobinado usa el mismo material ya impreso; en esta etapa se valora solo por el tiempo propio de la rebobinadora y la mano de obra.";
    }
    return { ...item, ...pricing, sourceIndex: index, calcBase: runBase, runMinutes, unitCost, supplyWidthIn, wastePct, netMaterialAreaFt2, materialBase, materialConsumptionKg, materialSubtotal, machineSubtotal, operatorSubtotal, plateCost, formulaText, explanation };
  });
  return { items, subtotal: r(items.reduce((sum, item) => sum + item.subtotal, 0)) };
}

function calcPackaging() {
  const base = metrics();
  const rolls = base.rollCount;
  const hours = n(state.form.packaging.yieldPerHour, 0) > 0 ? r(rolls / n(state.form.packaging.yieldPerHour, 0)) : 0;
  const pricing = applyProcessMinimum("empaque", r((hours * n(state.form.packaging.operators, 0) * n(state.form.packaging.hourCost, 0)) + n(state.form.packaging.externalCost, 0)));
  return { rolls, hours, ...pricing, formulaText: "Cantidad de Rollos = Cantidad de Productos / Etiquetas por Rollo. Tiempo (h) = Rollos / Rendimiento por Hora. Costo = Tiempo x Operarios x Costo Hora Operario + Costo Externo.", explanation: "Empaque calcula primero la cantidad de rollos dividiendo la cantidad de productos entre las etiquetas por rollo y luego valora el tiempo del área, la mano de obra y el costo externo." };
}

function calcAdditional() {
  const rows = state.form.additional.map((item) => ({ ...item, subtotal: r(n(item.cost, 0)) }));
  const pricing = applyProcessMinimum("adicionales", r(rows.reduce((sum, item) => sum + item.subtotal, 0)));
  return { rows, ...pricing };
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
  const frontBackElements = isFrontBackGroupContext() ? frontBackElementSubtotalSummary() : { items: [], subtotal: 0 };
  if (!isProcessAllowedForCurrentFrontBackContext("troquel")) troquel.subtotal = 0;
  if (!isProcessAllowedForCurrentFrontBackContext("sustrato")) {
    sustrato.rawSubtotal = 0;
    sustrato.subtotal = 0;
    sustrato.minimumApplied = false;
  }
  if (!isProcessAllowedForCurrentFrontBackContext("impresion")) {
    print.items = [];
    print.rawSubtotal = 0;
    print.subtotal = 0;
    print.minimumApplied = false;
  }
  const industrial = r(
    macula.subtotal
    + troquel.subtotal
    + sustrato.subtotal
    + design.subtotal
    + prepress.subtotal
    + plates.subtotal
    + print.subtotal
    + finishes.subtotal
    + packaging.subtotal
    + additional.subtotal
    + frontBackElements.subtotal
  );
  const commercial = state.form.commercial;
  const overhead = r(industrial * (1 + n(commercial.overheadPct, 0) / 100));
  const margin = r(overhead * (1 + n(commercial.marginPct, 0) / 100));
  const discountPct = n(commercial.discountPct, 0);
  const discount = discountPct > 0 ? r(margin * (discountPct / 100)) : 0;
  const afterDiscount = r(margin - discount);
  const tax = r(afterDiscount * (n(commercial.taxPct, 0) / 100));
  const total = r(afterDiscount + tax);
  const quantity = currentQuantity(state.form);
  return { macula, troquel, sustrato, design, prepress, plates, print, finishes, packaging, additional, frontBackElements, industrial, overhead, margin, discount, discountPct, taxPct: n(commercial.taxPct, 0), afterDiscount, tax, total, unit: quantity > 0 ? r(total / quantity, 6) : 0 };
}

function buildSavePayload() {
  syncDerivedHeaderAndPackaging(state.form);
  const result = totals();
  const validationState = buildCalculationValidationState(result);
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
    materialName: first(selectedSubstrateMaterial(state.form)?.nombre, selectedSubstrateMaterial(state.form)?.name, selectedSubstrateMaterial(state.form)?.descripcion, ""),
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
    validationSummary: validationState.hasBlockingIssues ? validationState.summaryText : "",
    validationMessages: validationState.blockingMessages,
    validationBlocking: validationState.hasBlockingIssues,
    jobName: state.form.header.jobName,
    department: "Flexografia",
    processResult: JSON.parse(JSON.stringify(result)),
    trackingClosure: state.quoteTracking.closure
      ? JSON.parse(JSON.stringify(state.quoteTracking.closure))
      : (state.context?.calculo?.raw_data?.Cierre_Cotizacion || null),
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
    els.calcStatus.textContent = error.message || "No fue posible guardar el cálculo.";
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

function normalizeConfigTextList(value, fallback = []) {
  let parsed = value;
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) {
      parsed = [];
    } else {
      try {
        parsed = JSON.parse(trimmed);
      } catch (_) {
        parsed = trimmed.split(/[\n,;]+/);
      }
    }
  }
  const source = Array.isArray(parsed) ? parsed : [];
  const seen = new Set();
  const items = source
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") return String(item.name || item.label || item.value || "").trim();
      return "";
    })
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return items.length ? items : [...fallback];
}

function resolveProductTypes() {
  return normalizeConfigTextList(state.config?.general?.quoteProductTypesJson, DEFAULT_PRODUCT_TYPES);
}

function resolveApplicationOptions() {
  const items = normalizeConfigTextList(state.config?.general?.quoteApplicationOptionsJson, DEFAULT_APPLICATION_OPTIONS);
  const current = String(state.form?.header?.applicationEnvironment || "").trim();
  return current && !items.some((item) => item.toLowerCase() === current.toLowerCase()) ? [...items, current] : items;
}

function renderApplicationEnvironmentOptions() {
  if (!els.applicationEnvironmentOptions) return;
  els.applicationEnvironmentOptions.innerHTML = resolveApplicationOptions().map((item) => `<option value="${esc(item)}"></option>`).join("");
}

function renderHeader() {
  syncFrontBackCalculationShell();
  fillSelect(els.productType, resolveProductTypes().map((item) => ({ value: item, label: item })), state.form.header.productType);
  fillSelect(els.workType, WORK_TYPES.map((item) => ({ value: item, label: item })), state.form.header.workType);
  fillSelect(els.outputType, outputTypesCatalog().map((item) => ({ value: item.id || item.codigo, label: item.name || item.nombre || item.id || item.codigo })), state.form.header.outputType);
  fillSelect(els.coreDiameter, coreDiameterSelectOptions(), state.form.header.coreDiameter);
  renderApplicationEnvironmentOptions();
  [["customerCode", els.customerCode], ["customerName", els.customerName], ["jobName", els.jobName], ["salespersonName", els.salespersonName], ["labelWidthIn", els.labelWidthIn], ["labelHeightIn", els.labelHeightIn], ["rollWidthIn", els.rollWidthIn], ["coreDiameter", els.coreDiameter], ["labelsPerRoll", els.labelsPerRoll], ["applicationType", els.applicationType], ["applicationEnvironment", els.applicationEnvironment], ["surfaceType", els.surfaceType], ["quantityTypes", els.quantityTypes], ["quantityChanges", els.quantityChanges], ["pantoneCount", els.pantoneCount]].forEach(([key, element]) => { element.value = state.form.header[key] ?? ""; });
  els.useCmyk.checked = Boolean(state.form.header.useCmyk);
  els.useWhiteInk.checked = Boolean(state.form.header.useWhiteInk);
  els.doubleWhitePass.checked = Boolean(state.form.header.doubleWhitePass);
  els.noPrint.checked = Boolean(state.form.header.noPrint);
  els.overheadPct.value = state.form.commercial.overheadPct;
  els.marginPct.value = state.form.commercial.marginPct;
  els.discountPct.value = state.form.commercial.discountPct ?? 0;
  els.taxPct.value = state.form.commercial.taxPct;
  if (els.customerNameDisplay) els.customerNameDisplay.textContent = state.form.header.customerName || "";
  if (els.salespersonDisplay) els.salespersonDisplay.textContent = state.form.header.salespersonName || "";
  syncHeaderUnitMasks();
  renderFavoriteDocumentButton();
  syncCustomerCodeWidth();
  renderFrontBackElementsCard();
  renderQuantities();
  outputPreview();
  refreshCalculationValidation();
}

function syncFrontBackCalculationShell() {
  const isElement = isFrontBackElementContext();
  const isEmbeddedElement = isEmbeddedView() && isElement;
  document.body.classList.toggle("is-front-back-element-context", isElement);
  document.body.classList.toggle("is-front-back-embedded", isEmbeddedView());
  document.body.classList.toggle("is-front-back-embedded-element", isEmbeddedElement);
  document.documentElement.classList.toggle("is-front-back-embedded-early", isEmbeddedElement);
  if (els.printConfigCard) els.printConfigCard.hidden = false;
}

function renderFrontBackElementsCard() {
  if (!els.frontBackElementsCard || !els.frontBackElementsBody) return;
  if (isFrontBackEmbeddedElementContext()) {
    els.frontBackElementsCard.hidden = true;
    els.frontBackElementsBody.innerHTML = "";
    return;
  }
  const group = currentFrontBackGroup();
  if (!group) {
    els.frontBackElementsCard.hidden = true;
    els.frontBackElementsBody.innerHTML = "";
    return;
  }
  const { groupLine, elements } = relatedFrontBackLines(group);
  if (!elements.length) {
    els.frontBackElementsCard.hidden = true;
    els.frontBackElementsBody.innerHTML = "";
    return;
  }
  els.frontBackElementsCard.hidden = false;
  if (isFrontBackElementContext()) {
    const groupRoute = storedLineRoute(groupLine || {});
    els.frontBackElementsBody.innerHTML = `
      <div class="front-back-group-note">
        <strong>Elemento ${esc(group.elementRole || "")}</strong>
        <span>La cantidad, sustrato, preprensa, planchas e impresión se controlan desde la línea grupo ${esc(group.groupLineCode)}.</span>
        ${groupRoute ? `<button type="button" class="inline-button" data-front-back-open-line="${esc(group.groupLineCode)}">Abrir grupo</button>` : ""}
      </div>
    `;
    return;
  }
  if (state.frontBackActiveElementLineCode && !elements.some((item) => item.code === state.frontBackActiveElementLineCode)) {
    state.frontBackActiveElementLineCode = "";
  }
  const active = elements.find((item) => item.code === state.frontBackActiveElementLineCode) || null;
  const tabMarkup = elements.map((item) => {
    const isActive = item.code === active?.code;
    const name = storedLineJobName(item.line) || item.code;
    return `<button type="button" class="front-back-element-tab${isActive ? " is-active" : ""}" data-front-back-element-tab="${esc(item.code)}" aria-selected="${isActive ? "true" : "false"}">
      <em>${esc(item.code)}</em>
      <strong>${esc(name)}</strong>
    </button>`;
  }).join("");
  const embeddedRoute = active ? frontBackEmbeddedRoute(active.line) : "";
  els.frontBackElementsBody.innerHTML = `
    <div class="front-back-element-tabs" role="tablist">${tabMarkup}</div>
    ${active && embeddedRoute ? `<div class="front-back-embedded-shell">
      <iframe class="front-back-embedded-frame" data-front-back-embedded-frame data-line-code="${esc(active.code)}" src="${esc(embeddedRoute)}" title="Cálculo ${esc(active.code)}"></iframe>
    </div>` : ""}
  `;
  bindFrontBackEmbeddedFrame();
}

function renderProcessLauncher() {
  if (!els.processLauncherButton || !els.processLauncherIcon || !els.processLauncherMenu) return;
  const launcherIcon = iconPresentation("processLauncher", "◎", "#0b81b8", 24);
  const refreshIcon = iconPresentation("refreshCosts", "↻", "#5b7896", 20);
  const activeExtras = (state.form?.activeProcessKeys || []).filter((key) => !processMeta(key)?.locked && isProcessAllowedForCurrentFrontBackContext(key));
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
  els.processLauncherMenu.innerHTML = configuredProcessDefinitions()
    .filter((item) => !item.locked && item.active !== false && isProcessAllowedForCurrentFrontBackContext(item.key))
    .map((item) => {
      const disabled = !item.repeatable && hasActiveProcess(item.key);
      return `<button type="button" class="process-launcher-item${disabled ? " is-disabled" : ""}" data-process-key="${esc(item.key)}"${disabled ? " disabled" : ' draggable="true"'}><strong>${esc(item.label)}</strong></button>`;
    })
    .join("");
  updateProcessLauncherMenuPlacement();
}

function renderProcessPicker() {
  if (!els.processPickerButton || !els.processPickerPanel || !els.processPickerMenu) return;
  els.processPickerButton.setAttribute("aria-expanded", state.processPickerOpen ? "true" : "false");
  if (state.processPickerOpen) els.processPickerPanel.removeAttribute("hidden");
  else els.processPickerPanel.setAttribute("hidden", "");
  els.processPickerMenu.innerHTML = configuredProcessDefinitions()
    .filter((item) => isProcessAllowedForCurrentFrontBackContext(item.key))
    .map((item) => {
      const disabled = item.locked || (!item.repeatable && hasActiveProcess(item.key));
      return `<button type="button" class="process-picker-item${disabled ? " is-disabled" : ""}" data-process-key="${esc(item.key)}"${disabled ? " disabled" : ""}${disabled ? "" : ' draggable="true"'}>${esc(item.label)}</button>`;
    })
    .join("");
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
          <div class="timeline-entry-avatar${trackingPhotoForName(entry.user) ? " has-photo" : ""}">${trackingAvatarContent(entry.user)}</div>
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
  bindTrackingAvatarFallback(els.timelineLauncherPanel);
  els.timelineLauncherLabel.textContent = "";
  updateProcessLauncherMenuPlacement();
}

function detailQuantityValues() {
  return normalizeQuantities(state.form?.header?.quantities || [])
    .map((item) => n(item.value, 0))
    .filter((value) => value > 0)
    .slice(0, 6);
}

function totalsForQuantity(quantity) {
  const originalQuantities = state.form.header.quantities;
  const originalQuantity = state.form.header.quantity;
  try {
    state.form.header.quantities = [{ id: "details-qty", value: quantity }];
    state.form.header.quantity = quantity;
    syncDerivedHeaderAndPackaging(state.form);
    return totals();
  } finally {
    state.form.header.quantities = originalQuantities;
    state.form.header.quantity = originalQuantity;
    syncDerivedHeaderAndPackaging(state.form);
  }
}

function sumInlineFinish(result = {}, match = {}) {
  return r((result.print?.items || []).reduce((sum, item) => {
    return sum + (item.inlineItems || []).reduce((inner, inline) => {
      if (!inline?.subtotal) return inner;
      const sameKey = match.processKey ? inline.processKey === match.processKey : true;
      const sameLabel = match.label ? String(inline.label || "") === String(match.label || "") : true;
      return sameKey && sameLabel ? inner + n(inline.subtotal, 0) : inner;
    }, 0);
  }, 0));
}

function sumExternalFinish(result = {}, match = {}) {
  return r((result.finishes?.items || []).reduce((sum, finish) => {
    if (!finish?.subtotal) return sum;
    const sameKey = match.processKey ? finish.processKey === match.processKey : true;
    const sameIndex = Number.isFinite(match.sourceIndex) ? finish.sourceIndex === match.sourceIndex : true;
    return sameKey && sameIndex ? sum + n(finish.subtotal, 0) : sum;
  }, 0));
}

function detailTooltipText(lines = []) {
  return lines.map((line) => String(line || "").trim()).filter(Boolean).slice(0, 5).join("\n");
}

function detailMinimumLine(block = {}) {
  if (!block?.minimumApplied) return "";
  return `Mínimo: max(${money(block.rawSubtotal || 0)}, ${money(block.minimumCost || 0)}) = ${money(block.subtotal || 0)}.`;
}

function detailInlineMatches(result = {}, match = {}) {
  return (result.print?.items || []).flatMap((item) => item.inlineItems || []).filter((inline) => {
    if (!inline?.subtotal) return false;
    const sameKey = match.processKey ? inline.processKey === match.processKey : true;
    const sameLabel = match.label ? String(inline.label || "") === String(match.label || "") : true;
    return sameKey && sameLabel;
  });
}

function detailExternalMatches(result = {}, match = {}) {
  return (result.finishes?.items || []).filter((finish) => {
    if (!finish?.subtotal) return false;
    const sameKey = match.processKey ? finish.processKey === match.processKey : true;
    const sameIndex = Number.isFinite(match.sourceIndex) ? finish.sourceIndex === match.sourceIndex : true;
    return sameKey && sameIndex;
  });
}

function detailSum(items = [], field = "") {
  return r(items.reduce((sum, item) => sum + n(item?.[field], 0), 0));
}

function detailDisplayValue(row = {}, result = {}) {
  const value = row.value?.(result) ?? 0;
  if (row.format === "feet") return `${num(value, 2)} ft`;
  if (row.format === "area") return `${num(value, 2)} ft²`;
  return money(value || 0);
}

function detailCleanText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function detailUniqueParts(parts = [], limit = 4) {
  const seen = new Set();
  const clean = [];
  parts.forEach((part) => {
    const value = detailCleanText(part);
    if (!value) return;
    const key = norm(value);
    if (seen.has(key)) return;
    seen.add(key);
    clean.push(value);
  });
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit).concat(`+${clean.length - limit}`);
}

function detailJoin(parts = [], limit = 4) {
  return detailUniqueParts(parts, limit).join(" · ");
}

function detailDimension(value, unit = "in", maximumFractionDigits = 2, prefix = "") {
  const amount = n(value, 0);
  if (amount <= 0) return "";
  return `${prefix}${num(amount, maximumFractionDigits)} ${unit}`.trim();
}

function detailMaterialName(materialId = "", fallback = "") {
  const material = findMaterial(materialId);
  return detailCleanText(first(material?.descripcion, material?.nombre, material?.codigo, fallback));
}

function detailMachineName(machineId = "", fallback = "") {
  const machine = findMachine(machineId);
  return detailCleanText(first(fallback, machineDisplayName(machine), machine?.nombre, machine?.codigo));
}

function detailDieSummary() {
  const code = detailCleanText(state.form?.troquel?.dieCode || "");
  const description = detailCleanText(state.form?.troquel?.dieDescription || "");
  if (code && description && !norm(description).includes(norm(code))) return `${code} ${description}`;
  return description || code;
}

function detailPlateSize(item = {}) {
  const width = n(item.plateWidthIn, 0);
  const length = n(item.plateLengthIn, 0);
  if (width <= 0 || length <= 0) return "";
  return `${num(width, 2)} x ${num(length, 2)} in`;
}

function detailNumberingSummary(item = {}) {
  const numberingType = normalizeNumberingType(item.numberingType, item.rangeFrom, item.rangeTo);
  const range = isConsecutiveNumbering(numberingType) && (item.rangeFrom || item.rangeTo)
    ? `Rango ${[item.rangeFrom || "?", item.rangeTo || "?"].join(" - ")}`
    : "";
  const attachment = normalizeNumberingAttachments(item)[0]?.fileName || item.attachmentName || "";
  return detailJoin([
    numberingType,
    range,
    first(item.detail, item.comment, ""),
    attachment ? `Adj. ${attachment}` : ""
  ], 3);
}

function detailInlineFinishSummary(inline = {}, stage = {}) {
  const key = String(inline.key || "").trim();
  if (key === "barniz") {
    const profile = varnishProfileInfo(stage);
    return detailJoin([profile.tipo, detailDimension(profile.gsm, "GSM", 2)]);
  }
  if (key === "numerado") return detailNumberingSummary(inline);
  if (key === "troquelado") return detailDieSummary();
  if (key === "embosado") return detailPlateSize(inline);
  if (key === "estampado" || key === "laminado") {
    return detailJoin([
      detailMaterialName(inline.materialId, inline.materialName),
      detailDimension(inline.supplyWidthIn, "in", 2, "Ancho ")
    ]);
  }
  return detailJoin([detailMaterialName(inline.materialId, inline.materialName), inline.comment]);
}

function detailExternalFinishSummary(finish = {}, config = {}) {
  const key = String(finish.processKey || config.key || "").trim();
  if (key === "troquelado") return detailDieSummary();
  if (key === "embosado") return detailPlateSize(finish);
  if (key === "barnizado") {
    return detailJoin([
      detailMaterialName(finish.materialId, finish.materialName),
      detailDimension(finish.layerGft2, "g/ft²", 2)
    ]);
  }
  if (key === "estampado" || key === "laminado") {
    return detailJoin([
      detailMaterialName(finish.materialId, finish.materialName),
      detailDimension(finish.supplyWidthIn, "in", 2, "Ancho ")
    ]);
  }
  return detailJoin([
    detailMachineName(finish.machineId, finish.machineName),
    finish.comment
  ]);
}

function detailPrintSummary(result = {}) {
  const machines = (result.print?.items || [])
    .map((item) => detailMachineName(item.machineId, item.machineName))
    .filter(Boolean);
  return detailUniqueParts(machines, 3).join(" · ");
}

function detailSubstrateSummary(result = {}) {
  return detailJoin([result.sustrato?.materialName, detailMaterialName(state.form?.substrate?.materialId)], 1) || "Sin sustrato";
}

function detailFinishesSummary(result = {}) {
  const items = (result.finishes?.items || []).filter((finish) => n(finish.subtotal, 0) > 0);
  return detailUniqueParts(items.map((finish) => {
    const config = EXTERNAL_FINISH_BY_KEY[finish.processKey] || {};
    return detailJoin([config.label || finish.description || "Acabado", detailExternalFinishSummary(finish, config)], 2);
  }), 3).join(" · ");
}

function detailAmountTooltip(row = {}, result = {}, quantity = 0) {
  const key = row.key || "";
  if (row.type === "measure") {
    return detailTooltipText([
      row.tooltip || row.label,
      `Valor: ${detailDisplayValue(row, result)}.`
    ]);
  }
  if (row.type === "inlineFinish") {
    const items = detailInlineMatches(result, row.match || {});
    const extras = r(detailSum(items, "materialSubtotal") + detailSum(items, "plateCost") + detailSum(items, "linearSubtotal") + detailSum(items, "fixedCost"));
    return detailTooltipText([
      `${row.label}: acabado dentro de impresión.`,
      "Fórmula: máquina + operador + insumos + fijos.",
      `Base: ${num(detailSum(items, "calcBase"), 2)} pies | Tiempo: ${num(detailSum(items, "totalMinutes"), 2)} min.`,
      `Ejemplo: ${money(detailSum(items, "machineSubtotal"))} + ${money(detailSum(items, "operatorSubtotal"))} + ${money(extras)} = ${money(row.value(result) || 0)}.`
    ]);
  }
  if (row.type === "externalFinish") {
    const items = detailExternalMatches(result, row.match || {});
    const finish = items[0] || {};
    const extras = r(detailSum(items, "materialSubtotal") + detailSum(items, "plateCost") + detailSum(items, "fixedCost") + items.reduce((sum, item) => sum + (n(item.calcBase, 0) * n(item.variableUnitCost, 0)), 0));
    return detailTooltipText([
      `${row.label}: ${finish.formulaText || "costo máquina + operador + insumos."}`,
      `Base: ${num(detailSum(items, "calcBase"), 2)} pies | Tiempo: ${num(detailSum(items, "runMinutes"), 2)} min.`,
      `Ejemplo: ${money(detailSum(items, "machineSubtotal"))} + ${money(detailSum(items, "operatorSubtotal"))} + ${money(extras)} = ${money(row.value(result) || 0)}.`
    ]);
  }
  if (key === "sustrato") {
    const s = result.sustrato || {};
    return detailTooltipText([
      `Cantidad: ${num(quantity, 0)}.`,
      "Fórmula: longitud total x costo/ft.",
      `Ejemplo: ${num(s.totalLengthFeet, 2)} ft x ${money(s.unitCost || 0)} = ${money(s.rawSubtotal ?? s.subtotal ?? 0)}.`,
      `Merma: montaje ${num(s.maculaSetupFeet, 2)} ft + tiraje ${num(s.maculaTirajeFeet, 2)} ft = ${num(s.startupWasteFeet, 2)} ft.`,
      `Área impresión: ${num(s.printedAreaFt2, 2)} ft².`,
      detailMinimumLine(s)
    ]);
  }
  if (key === "diseno") {
    const d = result.design || {};
    return detailTooltipText([
      "Fórmula: tiempo total x costo/h.",
      `Ejemplo: ${num(d.time, 2)} h x ${money(state.form.design.hourCost || 0)} = ${money(d.rawSubtotal ?? d.subtotal ?? 0)}.`,
      detailMinimumLine(d)
    ]);
  }
  if (key === "preprensa") {
    const p = result.prepress || {};
    return detailTooltipText([
      "Fórmula: artes / rendimiento x costo/h.",
      `Ejemplo: ${num(p.time, 2)} h x ${money(state.form.prepress.hourCost || 0)} = ${money(p.rawSubtotal ?? p.subtotal ?? 0)}.`,
      detailMinimumLine(p)
    ]);
  }
  if (key === "planchas") {
    const p = result.plates || {};
    const laser = Object.values(p.breakdown || {}).map((item) => item?.laserMetrics).find(Boolean) || {};
    const parts = PLATE_KEYS.map((entry) => {
      const subtotal = n(p.breakdown?.[entry.key]?.subtotal, 0);
      return subtotal ? `${entry.label}: ${money(subtotal)}` : "";
    }).filter(Boolean).join(" · ");
    return detailTooltipText([
      "Fórmula: plancha + grabado + revelado + limpieza + secado.",
      `Planchas/colores: ${num(laser.totalColors || 0, 0)} | Área: ${num(laser.totalArea || 0, 2)} in².`,
      parts ? `Detalle: ${parts}.` : "",
      detailMinimumLine(p)
    ]);
  }
  if (key === "impresion") {
    const p = result.print || {};
    return detailTooltipText([
      "Fórmula: máquina + operador + tinta + acabados en línea.",
      `Tiempo: ${num(p.totalMinutes || 0, 2)} min | Tinta: ${money(p.inkSubtotal || 0)}.`,
      `Ejemplo: ${money(p.machineSubtotal || 0)} + ${money(p.operatorSubtotal || 0)} + ${money(p.inkSubtotal || 0)} + ${money(p.inlineSubtotal || 0)} = ${money(p.rawSubtotal ?? p.subtotal ?? 0)}.`,
      detailMinimumLine(p)
    ]);
  }
  if (key === "acabados") {
    const items = (result.finishes?.items || []).filter((finish) => n(finish.subtotal, 0) > 0);
    const sample = items.slice(0, 3).map((finish) => `${EXTERNAL_FINISH_BY_KEY[finish.processKey]?.label || finish.description || "Acabado"}: ${money(finish.subtotal)}`).join(" · ");
    return detailTooltipText([
      `Suma de acabados externos (${items.length}).`,
      sample ? `Detalle: ${sample}.` : "Sin acabados externos activos.",
      `Total: ${money(result.finishes?.subtotal || 0)}.`
    ]);
  }
  if (key === "empaque") {
    const p = result.packaging || {};
    return detailTooltipText([
      "Fórmula: rollos / rendimiento x operarios x costo/h + externo.",
      `Rollos: ${num(p.rolls || 0, 2)} | Tiempo: ${num(p.hours || 0, 2)} h.`,
      `Ejemplo: ${num(p.hours || 0, 2)} h x ${num(state.form.packaging.operators || 0, 0)} op x ${money(state.form.packaging.hourCost || 0)} + ${money(state.form.packaging.externalCost || 0)} = ${money(p.rawSubtotal ?? p.subtotal ?? 0)}.`,
      detailMinimumLine(p)
    ]);
  }
  if (key === "adicionales") {
    const rows = (result.additional?.rows || []).filter((item) => n(item.subtotal, 0) > 0);
    const sample = rows.slice(0, 3).map((item) => `${item.description || item.name || "Adicional"}: ${money(item.subtotal)}`).join(" · ");
    return detailTooltipText([
      `Suma de adicionales (${rows.length}).`,
      sample ? `Detalle: ${sample}.` : "Sin adicionales activos.",
      detailMinimumLine(result.additional)
    ]);
  }
  if (key === "subtotal") {
    return detailTooltipText([
      "Fórmula: suma de costos industriales.",
      `Sustrato ${money(result.sustrato?.subtotal || 0)} + impresión ${money(result.print?.subtotal || 0)} + acabados ${money(result.finishes?.subtotal || 0)} + demás procesos = ${money(result.industrial || 0)}.`
    ]);
  }
  if (key === "overhead") {
    const pct = n(state.form.commercial.overheadPct, 0);
    return detailTooltipText([
      `Overhead: ${num(pct, 2)}%.`,
      `Fórmula: subtotal x porcentaje.`,
      `Ejemplo: ${money(result.industrial || 0)} x ${num(pct, 2)}% = ${money(row.value(result) || 0)}.`
    ]);
  }
  if (key === "margen") {
    const pct = n(state.form.commercial.marginPct, 0);
    return detailTooltipText([
      `Margen: ${num(pct, 2)}%.`,
      `Fórmula: total con overhead x porcentaje.`,
      `Ejemplo: ${money(result.overhead || 0)} x ${num(pct, 2)}% = ${money(row.value(result) || 0)}.`
    ]);
  }
  if (key === "descuento") {
    const pct = n(state.form.commercial.discountPct, 0);
    return detailTooltipText([
      `Descuento: ${num(pct, 2)}%.`,
      `Fórmula: total con margen x porcentaje.`,
      `Ejemplo: ${money(result.margin || 0)} x ${num(pct, 2)}% = ${money(Math.abs(row.value(result) || 0))}.`
    ]);
  }
  if (key === "totalAjustes") {
    return detailTooltipText([
      "Fórmula: subtotal + overhead + margen - descuento.",
      `Ejemplo: ${money(result.margin || 0)} - ${money(result.discount || 0)} = ${money(result.afterDiscount || 0)}.`
    ]);
  }
  if (key === "iva") {
    const pct = n(state.form.commercial.taxPct, 0);
    return detailTooltipText([
      `IVA: ${num(pct, 2)}%.`,
      `Fórmula: total con ajustes x IVA.`,
      `Ejemplo: ${money(result.afterDiscount || 0)} x ${num(pct, 2)}% = ${money(result.tax || 0)}.`
    ]);
  }
  if (key === "totalFinal") {
    return detailTooltipText([
      "Fórmula: total con ajustes + IVA.",
      `Ejemplo: ${money(result.afterDiscount || 0)} + ${money(result.tax || 0)} = ${money(result.total || 0)}.`
    ]);
  }
  if (key === "precioUnitario") {
    return detailTooltipText([
      "Fórmula: total final / cantidad.",
      `Ejemplo: ${money(result.total || 0)} / ${num(quantity, 0)} = ${money(result.unit || 0)}.`
    ]);
  }
  if (key === "precioMillar") {
    return detailTooltipText([
      "Fórmula: precio unitario x 1 000.",
      `Ejemplo: ${money(result.unit || 0)} x 1 000 = ${money(r(n(result.unit, 0) * 1000))}.`
    ]);
  }
  return detailTooltipText([`Monto: ${money(row.value?.(result) || 0)}.`]);
}

function detailAmountCell(row = {}, result = {}, index = 0, quantity = 0) {
  const tooltip = detailAmountTooltip(row, result, quantity);
  const classes = ["details-cost-value"];
  if (index === 0) classes.push("is-edit-target");
  if (tooltip) classes.push("has-tooltip");
  return `<div class="${classes.join(" ")}"${tooltip ? ` tabindex="0" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(tooltip)}" data-info-title="${esc(`Detalle ${row.label || ""}`)}" data-info-body="${esc(tooltip)}"` : ""}><span class="details-cost-value-text">${esc(detailDisplayValue(row, result))}</span></div>`;
}

function detailSubstrateRows() {
  return [
    { key: "sustratoCantidad", type: "measure", label: "Sustrato", child: true, breakdown: true, format: "feet", tooltip: "Sustrato neto antes de merma.", value: (result) => result.sustrato?.linealFeet },
    { key: "sustratoMermaMontaje", type: "measure", label: "Merma Sustrato Montaje", child: true, breakdown: true, format: "feet", tooltip: "Merma de montaje tomada de Costos por estación/proceso.", value: (result) => result.sustrato?.maculaSetupFeet },
    { key: "sustratoMermaTiraje", type: "measure", label: "Merma Sustrato Tiraje", child: true, breakdown: true, format: "feet", tooltip: "Merma de tiraje calculada con el porcentaje definido en Costos.", value: (result) => result.sustrato?.maculaTirajeFeet },
    { key: "sustratoTotalCantidad", type: "measure", label: "Total Sustrato", child: true, breakdown: true, format: "feet", tooltip: "Sustrato neto más merma de montaje y merma de tiraje.", value: (result) => result.sustrato?.totalLengthFeet },
    { key: "sustratoAreaImpresion", type: "measure", label: "Área de Impresión", child: true, breakdown: true, format: "area", tooltip: "Área neta impresa del trabajo.", value: (result) => result.sustrato?.printedAreaFt2 }
  ];
}

function detailCostRows(baseResult = {}) {
  const inlineFinishes = [];
  (baseResult.print?.items || []).forEach((item) => {
    (item.inlineItems || []).forEach((inline) => {
      if (!inline.active && !n(inline.subtotal, 0)) return;
      const key = `${inline.processKey || ""}|${inline.label || ""}`;
      if (inlineFinishes.some((row) => row.key === key)) return;
      inlineFinishes.push({
        key,
        type: "inlineFinish",
        label: inline.label || processLabelFromKey(inline.processKey) || "Acabado",
        detail: detailInlineFinishSummary(inline, item),
        child: true,
        jumpKey: "impresion",
        match: { processKey: inline.processKey, label: inline.label },
        value: (result) => sumInlineFinish(result, { processKey: inline.processKey, label: inline.label })
      });
    });
  });
  const externalFinishes = (baseResult.finishes?.items || [])
    .map((finish, index) => {
      const config = EXTERNAL_FINISH_BY_KEY[finish.processKey] || {};
      return {
        key: `external-${finish.processKey || index}-${finish.sourceIndex ?? index}`,
        type: "externalFinish",
        label: config.label || finish.description || "Acabado",
        detail: detailExternalFinishSummary(finish, config),
        jumpKey: finish.processKey || "",
        match: { processKey: finish.processKey, sourceIndex: finish.sourceIndex },
        value: (result) => sumExternalFinish(result, { processKey: finish.processKey, sourceIndex: finish.sourceIndex })
      };
    });
  const frontBackElementRows = isFrontBackGroupContext()
    ? (baseResult.frontBackElements?.items || []).map((item, index) => {
      const role = item.role ? `${item.role.charAt(0).toUpperCase()}${item.role.slice(1)}` : "Elemento";
      const name = storedLineJobName(item.line);
      return {
        key: `elementoFrenteDorso-${item.code || index}`,
        label: `Elemento ${index + 1}`,
        detail: [role, item.code, name].filter(Boolean).join(" · "),
        child: true,
        value: (result) => {
          const match = (result.frontBackElements?.items || []).find((entry) => entry.code === item.code);
          return match?.subtotal ?? item.subtotal;
        }
      };
    }) : [];
  const frontBackElementTotalRow = frontBackElementRows.length ? [{
    key: "sumaElementosFrenteDorso",
    label: "Suma de elementos",
    value: (result) => result.frontBackElements?.subtotal,
    total: true
  }] : [];
  const rows = [
    { key: "troquel", label: "Troquel", detail: detailDieSummary() || "Sin troquel", jumpKey: "troquel", value: (result) => result.troquel?.subtotal },
    { key: "sustrato", label: "Sustrato", detail: detailSubstrateSummary(baseResult), jumpKey: "sustrato", expandKey: "sustrato", value: (result) => result.sustrato?.subtotal },
    ...(state.detailsOpen?.sustrato ? detailSubstrateRows() : []),
    { key: "diseno", label: "Diseño", jumpKey: "diseno", value: (result) => result.design?.subtotal },
    { key: "preprensa", label: "Preprensa", jumpKey: "preprensa", value: (result) => result.prepress?.subtotal },
    { key: "planchas", label: "Planchas", jumpKey: "planchas", value: (result) => result.plates?.subtotal },
    { key: "impresion", label: "Impresión", detail: detailPrintSummary(baseResult), jumpKey: "impresion", value: (result) => result.print?.subtotal },
    ...inlineFinishes,
    ...externalFinishes,
    { key: "empaque", label: "Empaque", jumpKey: "empaque", value: (result) => result.packaging?.subtotal },
    { key: "adicionales", label: "Adicionales", jumpKey: "adicionales", value: (result) => result.additional?.subtotal },
    ...frontBackElementRows,
    ...frontBackElementTotalRow,
    { key: "subtotal", label: "Subtotal", value: (result) => result.industrial, total: true },
    { key: "overhead", label: "Overhead", commercialKey: "overheadPct", value: (result) => r(n(result.overhead, 0) - n(result.industrial, 0)) },
    { key: "margen", label: "Margen", commercialKey: "marginPct", value: (result) => r(n(result.margin, 0) - n(result.overhead, 0)) },
    { key: "descuento", label: "Descuento", commercialKey: "discountPct", value: (result) => -n(result.discount, 0) },
    { key: "totalAjustes", label: "Total con Ajustes", value: (result) => result.afterDiscount, total: true },
    { key: "iva", label: "IVA", commercialKey: "taxPct", value: (result) => result.tax },
    { key: "totalFinal", label: "Total Final", value: (result) => result.total, total: true, final: true },
    { key: "precioUnitario", label: "Precio Unitario", value: (result) => result.unit },
    { key: "precioMillar", label: "Precio por Millar", value: (result) => r(n(result.unit, 0) * 1000) }
  ];
  return rows;
}

function detailAlertMessagesForRow(row = {}, validationState = state.processValidation) {
  const alerts = validationState?.alerts || {};
  const keys = new Set([row.validationKey, row.key, row.jumpKey].filter(Boolean));
  (row.validationKeys || []).forEach((key) => key && keys.add(key));
  if (row.key === "impresion") {
    Object.keys(alerts).filter((key) => key.startsWith("impresion-")).forEach((key) => keys.add(key));
  }
  if (row.key === "acabados") {
    Object.keys(alerts).forEach((key) => {
      const processKey = key.replace(/-\d+$/, "");
      if (EXTERNAL_FINISH_BY_KEY[processKey]) keys.add(key);
    });
  }
  if (row.type === "externalFinish" && row.match?.processKey) {
    if (Number.isFinite(row.match.sourceIndex)) keys.add(`${row.match.processKey}-${row.match.sourceIndex}`);
  }
  return uniqueMessages([...keys].flatMap((key) => alerts[key] || []));
}

function detailShortAlertText(row = {}, alertMessages = []) {
  const text = norm(alertMessages.join(" "));
  if (!text) return "";
  if (text.includes("sustrato")) return "Sin sustrato";
  if (text.includes("maquina")) return "Sin máquina";
  if (row.key === "troquel" || text.includes("falta troquel")) return "Sin troquel";
  if (text.includes("material")) return "Sin material";
  if (text.includes("tipo")) return "Sin tipo";
  if (text.includes("costo")) return "Sin costo";
  if (text.includes("velocidad")) return "Sin velocidad";
  if (text.includes("setup")) return "Sin setup";
  return "Revisar";
}

function detailLabelMarkup(row = {}) {
  const detail = detailCleanText(row.detail || "");
  const full = detail ? `${row.label} - ${detail}` : row.label;
  return `<span class="details-label-text" title="${esc(full)}"><span class="details-label-main">${esc(row.label)}</span>${detail ? `<span class="details-label-separator"> - </span><span class="details-label-extra">${esc(detail)}</span>` : ""}</span>`;
}

function detailRowLabel(row = {}) {
  if (row.commercialKey) {
    const pct = n(state.form?.commercial?.[row.commercialKey], 0);
    return `<button type="button" class="details-adjust-trigger" data-details-edit="${esc(row.commercialKey)}"><span>${esc(row.label)}</span><small>${num(pct, 2)}%</small></button>`;
  }
  if (row.expandKey) {
    const expanded = Boolean(state.detailsOpen?.[row.expandKey]);
    const toggle = `<button type="button" class="details-expand-toggle" data-details-toggle="${esc(row.expandKey)}" aria-expanded="${expanded ? "true" : "false"}" aria-label="${expanded ? "Contraer" : "Expandir"} ${esc(row.label)}">${expanded ? "▾" : "▸"}</button>`;
    const label = row.jumpKey
      ? `<button type="button" class="details-jump-link" data-jump-process="${esc(row.jumpKey)}">${detailLabelMarkup(row)}</button>`
      : detailLabelMarkup(row);
    return `<span class="details-label-group">${toggle}${label}</span>`;
  }
  if (row.jumpKey) {
    return `<button type="button" class="details-jump-link" data-jump-process="${esc(row.jumpKey)}">${detailLabelMarkup(row)}</button>`;
  }
  return detailLabelMarkup(row);
}

function detailRowLabelWithAlert(row = {}, alertMessages = []) {
  const fullAlertText = summarizeMessages(alertMessages, 2);
  const alertText = detailShortAlertText(row, alertMessages);
  const displayRow = alertText && norm(row.detail || "").includes(norm(alertText)) ? { ...row, detail: "" } : row;
  const alertMarkup = alertText ? `<span class="details-row-alert" title="${esc(fullAlertText)}">${esc(alertText)}</span>` : "";
  return `<span class="details-row-label-wrap">${detailRowLabel(displayRow)}${alertMarkup}</span>`;
}

function detailsGridStyle(quantityCount) {
  const count = Math.max(1, Number(quantityCount) || 1);
  return `grid-template-columns:minmax(170px,220px) repeat(${count}, minmax(104px,1fr));`;
}

function detailEditableLabel(row = {}) {
  if (!row.commercialKey) return detailRowLabel(row);
  const pct = n(state.form?.commercial?.[row.commercialKey], 0);
  return `<button type="button" class="details-adjust-trigger" data-details-edit="${esc(row.commercialKey)}"><span>${esc(row.label)}</span><small>${num(pct, 2)}%</small></button>`;
}

function renderQuoteTracking() {
  if (!els.quoteTrackingMount || !state.form) return;
  const trackingId = quoteTrackingStorageId();
  if (state.quoteTracking.id !== trackingId || !Array.isArray(state.quoteTracking.milestones) || !state.quoteTracking.milestones.length) {
    state.quoteTracking.id = trackingId;
    state.quoteTracking.milestones = loadQuoteTrackingMilestones();
  }
  const milestones = state.quoteTracking.milestones;
  const quoteCode = String(state.form.header.quoteCode || "").trim() || "Sin base";
  const lineCode = String(state.form.header.lineCode || "").trim();
  const quoteRoute = state.form.header.quoteCode ? `/cotizaciones/documento?codigo=${encodeURIComponent(state.form.header.quoteCode)}` : "";
  const customerName = String(state.form.header.customerName || "").trim() || "Cliente sin definir";
  const doneCount = quoteTrackingDoneCount();
  const panelOpen = Boolean(state.quoteTracking.panelOpen);
  const statusText = milestones[milestones.length - 1]?.done ? "Cerrada" : doneCount >= 4 ? "Proforma enviada" : doneCount >= 3 ? "Cotización finalizada" : "En proceso";
  const nextLabels = ["Completar solicitud del vendedor", "Completar solicitud del vendedor", "Finalizar cotización", "Enviar proforma al cliente", "Finalizar comercialmente"];
  const body = milestones.map((item, index) => {
    const available = quoteTrackingAvailable(index);
    const last = index === milestones.length - 1;
    const opacity = item.done ? "1" : available ? "0.72" : "0.38";
    let node = "";
    if (item.done) {
      const undoable = !item.fixed;
      node = `<button type="button" class="tl-done-btn tl-avatar-anim${trackingPhotoForName(item.user) ? " has-photo" : ""}${undoable ? " undoable" : ""}" style="background:${esc(item.color)};"${undoable ? ` data-tracking-undo="${index}" title="Deshacer este hito y los siguientes" aria-label="Deshacer ${esc(item.label)}"` : ""}>${trackingAvatarContent(item.user)}${undoable ? '<span class="tl-undo-overlay"><i class="ti ti-arrow-back-up" style="font-size:15px;color:#fff;" aria-hidden="true"></i></span>' : ""}<span class="tl-check-badge"><i class="ti ti-check" style="font-size:9px;color:#fff;" aria-hidden="true"></i></span></button>`;
    } else if (item.cr) {
      node = `<div style="position:relative;flex-shrink:0;"><div class="tl-locked" style="border-color:#d97706;"><i class="ti ${esc(item.icon)}" style="font-size:17px;color:#d97706;" aria-hidden="true"></i></div><span class="tl-warn-badge"><i class="ti ti-alert-triangle" style="font-size:8px;color:#fff;" aria-hidden="true"></i></span></div>`;
    } else if (available) {
      node = `<button type="button" class="tl-pending-btn" data-tracking-complete="${index}" title="Marcar como completado" aria-label="Completar ${esc(item.label)}"><i class="ti ${esc(item.icon)}" style="font-size:17px;" aria-hidden="true"></i></button>`;
    } else {
      node = `<div class="tl-locked"><i class="ti ${esc(item.icon)}" style="font-size:17px;" aria-hidden="true"></i></div>`;
    }
    const solid = item.done && !last && milestones[index + 1]?.done;
    const line = last ? "" : solid ? '<div style="flex:1;width:2px;background:var(--color-border-secondary);margin:6px 0;min-height:22px;"></div>' : '<div style="flex:1;border-left:2px dashed var(--color-border-tertiary);margin:6px 0;min-height:22px;width:0;"></div>';
    let content = "";
    if (item.done) {
      const changeButton = item.canCR ? `<button type="button" class="btn-changes" data-tracking-open-form="${index}" aria-label="${esc(item.crLabel)}"><i class="ti ti-message-report" style="font-size:12px;" aria-hidden="true"></i>${esc(item.crWho)}: solicitar cambios</button>` : "";
      const form = state.quoteTracking.formOpenKey === item.key ? `<div class="cr-form"><div style="font-size:12px;font-weight:500;color:var(--color-text-primary);margin-bottom:8px;">${esc(item.crLabel)}</div><textarea id="quoteTrackingText-${index}" class="cr-textarea" placeholder="${esc(item.crPH)}" data-tracking-textarea></textarea><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;"><button type="button" class="btn-cancel" data-tracking-close-form>Cancelar</button><button type="button" class="btn-submit" data-tracking-submit-cr="${index}"><i class="ti ti-send" style="font-size:12px;" aria-hidden="true"></i>Enviar y revertir</button></div></div>` : "";
      const closure = item.key === "cierre" ? state.quoteTracking.closure : null;
      const orderLink = closure?.orderCode ? `<a class="summary-row-link" href="/orden-produccion/${encodeURIComponent(closure.orderCode)}" data-route="/orden-produccion/${esc(encodeURIComponent(closure.orderCode))}" data-label="Orden ${esc(closure.orderCode)}">${esc(closure.orderCode)}</a>` : "";
      const closureText = closure
        ? (closure.outcome === "accepted"
          ? `Venta aceptada${closure.orderCode ? " · Orden " : ""}`
          : `Cierre sin venta · ${closure.reason || "Sin motivo"}`)
        : "";
      const closureNote = closureText ? `<div class="tracking-close-note"><strong>${esc(closureText)}${orderLink}</strong>${closure.comments ? `<span>${esc(closure.comments)}</span>` : ""}</div>` : "";
      const productBtn = item.key === "cierre" ? `<div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="btn-mark tracking-product-action" data-tracking-create-product aria-label="Crear producto" style="font-size:11px;padding:5px 10px;"><i class="ti ti-box" style="font-size:11px;" aria-hidden="true"></i>Crear producto</button></div>` : "";
      content = `<div class="tl-content-anim" style="padding-bottom:18px;"><div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;"><i class="ti ${esc(item.icon)}" style="font-size:14px;color:var(--color-text-secondary);" aria-hidden="true"></i><span style="font-size:13px;font-weight:500;color:var(--color-text-primary);">${esc(item.label)}</span></div><div style="font-size:13px;color:var(--color-text-primary);">${esc(item.user || "")}</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${esc(item.date || "Pendiente")}</div>${closureNote}${changeButton}${form}${productBtn}</div>`;
    } else if (item.cr) {
      const crNote = `<div class="cr-note"><div style="font-size:11px;font-weight:500;color:var(--color-text-warning);">Cambios solicitados por ${esc(item.cr.by)}</div><div style="font-size:11px;color:var(--color-text-warning);margin-top:2px;">${esc(item.cr.date)}</div><div style="font-size:12px;color:var(--color-text-primary);margin-top:6px;line-height:1.4;">"${esc(item.cr.comment)}"</div></div>`;
      content = `<div style="padding-bottom:18px;"><div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;"><i class="ti ${esc(item.icon)}" style="font-size:14px;color:#d97706;" aria-hidden="true"></i><span style="font-size:13px;font-weight:500;color:var(--color-text-primary);">${esc(item.label)}</span></div>${crNote}<button type="button" class="btn-mark" data-tracking-complete="${index}" style="margin-top:10px;" aria-label="Marcar ${esc(item.label)} como completado"><i class="ti ti-check" style="font-size:12px;" aria-hidden="true"></i>Marcar como hecho</button></div>`;
    } else if (available) {
      const proformaButton = item.key === "envio" ? '<button type="button" class="btn-mark" data-tracking-proforma aria-label="Ver proforma"><i class="ti ti-file-invoice" style="font-size:12px;" aria-hidden="true"></i>Ver Proforma</button>' : "";
      const closeForm = state.quoteTracking.formOpenKey === "cierre-descarte" ? `<div class="tracking-close-form"><label><span>Motivo</span><select id="quoteTrackingCloseReason" data-tracking-close-input><option value="">Selecciona un motivo</option>${QUOTE_CLOSE_REASON_OPTIONS.map((reason) => `<option value="${esc(reason)}">${esc(reason)}</option>`).join("")}</select></label><label><span>Comentario</span><textarea id="quoteTrackingCloseComments" class="cr-textarea" placeholder="Comentario para gerencia" data-tracking-close-input></textarea></label><div class="tracking-close-actions"><button type="button" class="btn-cancel" data-tracking-close-form>Cancelar</button><button type="button" class="btn-submit" data-tracking-submit-close="${index}"><i class="ti ti-send" style="font-size:12px;" aria-hidden="true"></i>Guardar cierre</button></div></div>` : "";
      const closeActions = item.key === "cierre"
        ? `<div class="tracking-close-menu"><button type="button" class="btn-mark tracking-primary-action" data-tracking-create-order="${index}" aria-label="Crear orden de producción"><i class="ti ti-check" style="font-size:12px;" aria-hidden="true"></i>Crear orden</button><button type="button" class="btn-mark tracking-secondary-action" data-tracking-open-close-reason="${index}" aria-label="Dar motivo de cierre"><i class="ti ti-message-report" style="font-size:12px;" aria-hidden="true"></i>Dar motivo</button><button type="button" class="btn-mark tracking-product-action" data-tracking-create-product aria-label="Crear producto"><i class="ti ti-box" style="font-size:12px;" aria-hidden="true"></i>Crear producto</button></div>${closeForm}`
        : `<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="btn-mark" data-tracking-complete="${index}" aria-label="Marcar ${esc(item.label)} como completado"><i class="ti ti-check" style="font-size:12px;" aria-hidden="true"></i>${item.key === "envio" ? "Marcar como enviada" : "Marcar como hecho"}</button>${proformaButton}</div>`;
      content = `<div style="padding-bottom:18px;"><div style="margin-bottom:6px;font-size:13px;font-weight:500;color:var(--color-text-secondary);">${esc(item.label)}</div>${closeActions}</div>`;
    } else {
      content = `<div style="padding-bottom:18px;"><div style="margin-bottom:4px;font-size:13px;font-weight:500;color:var(--color-text-secondary);">${esc(item.label)}</div><div style="font-size:12px;color:var(--color-text-tertiary);">${esc(item.hint || "")}</div></div>`;
    }
    return `<div style="display:grid;grid-template-columns:48px 1fr;gap:0 14px;opacity:${opacity};"><div style="display:flex;flex-direction:column;align-items:center;">${node}${line}</div>${content}</div>`;
  }).join("");
  els.quoteTrackingMount.innerHTML = `<h2 class="sr-only">Panel de seguimiento con solicitudes de cambio por hito</h2><div class="quote-tracking-wrap"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 16px;background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);margin-bottom:10px;"><div style="display:grid;gap:4px;min-width:0;flex:1;overflow:hidden;"><a class="quote-tracking-code summary-row-link" href="${esc(quoteRoute || "#")}"${quoteRoute ? ` data-route="${esc(quoteRoute)}" data-label="Cotización ${esc(quoteCode)}"` : ""} style="font-size:13px;font-weight:500;color:var(--color-text-primary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(quoteCode)}</a><span style="font-size:13px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(customerName)}</span><span style="font-size:11px;font-weight:500;padding:3px 10px;border-radius:999px;background:var(--color-background-info);color:var(--color-text-info);width:max-content;max-width:100%;">${esc(statusText)}</span></div><button type="button" id="tl-btn" data-tracking-toggle style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--border-radius-md);border:0.5px solid ${panelOpen ? "var(--color-border-info)" : "var(--color-border-secondary)"};background:${panelOpen ? "var(--color-background-info)" : "var(--color-background-secondary)"};color:${panelOpen ? "var(--color-text-info)" : "var(--color-text-primary)"};font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;flex-shrink:0;"><i class="ti ti-route" style="font-size:16px;" aria-hidden="true"></i>Seguimiento</button></div><div id="tl-panel" style="display:${panelOpen ? "block" : "none"};background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;"><div style="display:flex;align-items:center;justify-content:space-between;padding:15px 20px 13px;border-bottom:0.5px solid var(--color-border-tertiary);"><div><div style="font-size:15px;font-weight:500;color:var(--color-text-primary);">Historial de seguimiento</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px;">${esc(quoteCode)} · ${esc(customerName)}</div></div><span id="counter-badge" style="font-size:11px;font-weight:500;padding:4px 12px;border-radius:999px;background:${doneCount === milestones.length ? "var(--color-background-success)" : "var(--color-background-warning)"};color:${doneCount === milestones.length ? "var(--color-text-success)" : "var(--color-text-warning)"};">${doneCount} de ${milestones.length} completados</span></div><div id="tl-body" style="padding:20px 24px 4px;">${body}</div><div id="tl-footer" style="display:flex;align-items:center;gap:8px;padding:12px 24px 15px;border-top:0.5px solid var(--color-border-tertiary);margin-top:16px;"><i id="footer-icon" class="ti ${doneCount >= milestones.length ? "ti-circle-check" : "ti-arrow-right-circle"}" style="font-size:16px;color:${doneCount >= milestones.length ? "var(--color-text-success)" : "var(--color-text-info)"};" aria-hidden="true"></i><span id="next-step-text" style="font-size:12px;color:var(--color-text-secondary);">${doneCount >= milestones.length ? '<span style="font-weight:500;color:var(--color-text-success);">Cotización completamente cerrada</span>' : `Próximo paso: <span style="font-weight:500;color:var(--color-text-primary);">${esc(nextLabels[doneCount] || nextLabels[0])}</span>`}</span></div></div></div>`;
  bindTrackingAvatarFallback(els.quoteTrackingMount);
}

function renderDetailsDemo(baseResult = totals()) {
  if (!els.detailsCostTable) return;
  renderQuoteTracking();
  const quantities = detailQuantityValues();
  const quoteCode = String(state.form.header.quoteCode || "").trim();
  const lineCode = String(state.form.header.lineCode || "").trim();
  if (els.detailsLineBadge) els.detailsLineBadge.textContent = lineCode ? `Línea ${lineCode}` : "Línea sin base";
  if (!quantities.length) {
    els.detailsCostTable.innerHTML = '<div class="details-empty">Agrega cantidades para ver el detalle.</div>';
    return;
  }
  const results = quantities.map((quantity, index) => (index === 0 && n(quantity, 0) === currentQuantity(state.form)) ? baseResult : totalsForQuantity(quantity));
  const rows = detailCostRows(baseResult);
  const validationState = buildCalculationValidationState(baseResult);
  const gridStyle = detailsGridStyle(quantities.length);
  const header = `<div class="details-cost-row details-cost-head" style="${esc(gridStyle)}"><div>Cantidades</div>${quantities.map((quantity) => `<div class="details-cost-value details-quantity-cell">${esc(num(quantity, 0))}</div>`).join("")}</div>`;
  const body = rows.map((row) => {
    const classes = ["details-cost-row"];
    if (row.child) classes.push("is-child");
    if (row.breakdown) classes.push("is-breakdown");
    if (row.total) classes.push("is-total");
    if (row.final) classes.push("is-final");
    const alertMessages = detailAlertMessagesForRow(row, validationState);
    const alertText = summarizeMessages(alertMessages, 2);
    if (alertMessages.length) classes.push("is-alert");
    const cells = results.map((result, index) => detailAmountCell(row, result, index, quantities[index])).join("");
    return `<div class="${classes.join(" ")}" style="${esc(gridStyle)}"${alertText ? ` title="${esc(alertText)}"` : ""}><div>${detailRowLabelWithAlert(row, alertMessages)}</div>${cells}</div>`;
  }).join("");
  els.detailsCostTable.innerHTML = header + body;
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
  const deleteIcon = getProcessDeleteIconConfig();
  els.processSections.querySelectorAll(".process-card").forEach((cardNode) => {
    const key = cardNode.dataset.processKey;
    if (!key || processMeta(key)?.locked) return;
    if (cardNode.querySelector(".process-remove-button")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "process-remove-button";
    button.dataset.action = "remove-process";
    button.dataset.removeType = "single";
    button.dataset.removeIndex = key;
    button.setAttribute("aria-label", "Eliminar proceso");
    button.setAttribute("title", "Eliminar proceso");
    button.style.setProperty("--process-delete-icon-color", deleteIcon.primary);
    button.style.setProperty("--process-delete-icon-hover", deleteIcon.hover);
    button.style.setProperty("--process-delete-icon-size", `${deleteIcon.size}px`);
    button.innerHTML = renderIconMarkup(deleteIcon.value, "Eliminar proceso", "process-delete-icon");
    cardNode.appendChild(button);
  });
}

function renderSidebar(result) {
  renderDetailsDemo(result);
  const material = findMaterial(state.form.substrate.materialId);
  const printProcess = findProcess(state.form.print.processId);
  const quantities = normalizeQuantities(state.form.header.quantities).map((item) => num(item.value, 0)).join(" │ ");
  const processProductiveType = currentPrintProductionType() || (state.form.header.noPrint ? "Sin impresion" : state.form.header.processType || "Flexografia");
  const autoSelection = autoSelectionSnapshot();
  const autoPricing = autoPricingSnapshot();
  const autoWarnings = autoWarningsList();
  const autoProcesses = autoProcessSnapshot();
  const currentAutoRoute = state.context?.calculo?.processType || autoSelection?.route || "";
  const autoMachineName = "";
  const autoMaterialName = first(autoSelection?.materialName, state.context?.calculo?.materialName, "");
  const autoDieCode = first(autoSelection?.dieCode, state.context?.calculo?.dieCode, "");
  const currentMachineName = printProcess?.machine_name || state.form.print.machineName || "";
  const currentMaterialName = material?.descripcion || "";
  const currentDieCode = state.form.troquel.dieCode || "";
  const currentLabelsPerRoll = n(state.form.header.labelsPerRoll, 0);
  const autoLabelsPerRoll = n(first(autoSelection?.labelsPerRoll, state.context?.calculo?.labelsPerRoll), 0);
  const manualOverride = Boolean(
    (currentMachineName && autoMachineName && norm(currentMachineName) !== norm(autoMachineName))
    || (currentMaterialName && autoMaterialName && norm(currentMaterialName) !== norm(autoMaterialName))
    || (currentDieCode && autoDieCode && norm(currentDieCode) !== norm(autoDieCode))
    || (currentLabelsPerRoll > 0 && autoLabelsPerRoll > 0 && currentLabelsPerRoll !== autoLabelsPerRoll)
    || (processProductiveType && currentAutoRoute && norm(processProductiveType) !== norm(currentAutoRoute))
  );
  const plateRule = digitalPlateRuleApplies() ? "Planchas no se cobran" : "Planchas sí se cobran";
  const statusBase = state.form.header.quoteCode && state.form.header.lineCode ? `Evaluando ${state.form.header.quoteCode} / ${state.form.header.lineCode}.` : "Evaluando cálculo de flexografía.";
  els.calcStatus.textContent = digitalPlateRuleApplies() ? `${statusBase} ${digitalPlateRuleMessage()}` : statusBase;
  const quoteCode = String(state.form.header.quoteCode || "").trim();
  const quoteRoute = quoteCode ? `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}` : "";
  const quoteValue = quoteRoute
    ? `<a class="summary-row-link" href="${esc(quoteRoute)}" data-route="${esc(quoteRoute)}" data-label="Cotización ${esc(quoteCode)}">${esc(quoteCode)}</a>`
    : esc("Sin base");
  els.contextRows.innerHTML = [["Cotización", quoteValue, true], ["Línea", state.form.header.lineCode || "Sin base"], ["Cantidades productos", quantities || "Sin definir"], ["Cantidad base", num(currentQuantity(state.form), 0)], ["Troquel", state.form.troquel.dieCode || "No definido"], ["Sustrato", material?.descripcion || "No definido"], ["Máquina impresión", printProcess?.machine_name || state.form.print.machineName || "No definida"], ["Proceso productivo", processProductiveType], ["Ruta automática", state.context?.calculo?.processType || autoSelection?.route || "No definida"], ["Montaje base", first(autoSelection?.mounting?.summary, state.context?.calculo?.raw_data?.["REQ | Montaje Automático"], "Pendiente")], ["Regla planchas", plateRule], ["Estado línea", state.form.header.lineStatus || "En evaluación"]].map(([label, value, html]) => `<div class="summary-row"><span>${esc(label)}</span><span class="summary-row-value">${html ? value : esc(value)}</span></div>`).join("");
  if (els.automaticSummaryRows) {
    const processSequence = autoProcesses.length
      ? autoProcesses.map((item) => item.processName || item.name || item.processKey || "").filter(Boolean).join(" → ")
      : first(state.context?.calculo?.raw_data?.Texto_Secuencia_Procesos, "Pendiente");
    els.automaticSummaryRows.innerHTML = [
      ["Umbral digital", num(first(autoSelection?.digitalThreshold, state.context?.calculo?.raw_data?.Seleccion_Automatica?.digitalThreshold), 0)],
      ["Ruta", state.context?.calculo?.processType || autoSelection?.route || "No definida"],
      ["Familia solicitada", first(autoSelection?.materialFamily, "Pendiente")],
      ["Material automático", first(autoSelection?.materialName, state.context?.calculo?.materialName, "Pendiente")],
      ["Máquina automática", "No definida"],
      ["Troquel automático", first(autoSelection?.dieCode, state.context?.calculo?.dieCode, "No definido")],
      ["Etiquetas por rollo", num(first(autoSelection?.labelsPerRoll, state.context?.calculo?.labelsPerRoll), 0)],
      ["Montaje automático", first(autoSelection?.mounting?.summary, "Pendiente")],
      ["Decisión vigente", manualOverride ? "Manual del cotizador" : "Automática"],
      ["Usar automático", manualOverride ? "No" : "Sí"],
      ["Secuencia", processSequence || "Pendiente"],
      ["Sustrato base", autoPricing?.materialCost > 0 ? money(autoPricing.materialCost) : "Pendiente"],
      ["Producción base", autoPricing?.productionCost > 0 ? money(autoPricing.productionCost) : "Pendiente"],
      ["Subtotal automático", autoPricing?.subtotalBeforeTax > 0 ? money(autoPricing.subtotalBeforeTax) : "Pendiente"],
      ["IVA automático", autoPricing?.taxAmount > 0 ? money(autoPricing.taxAmount) : "Pendiente"],
      ["Total automático", autoPricing?.totalAmount > 0 ? money(autoPricing.totalAmount) : "Pendiente"]
    ].map(([label, value]) => `<div class="summary-row${label === "Total automático" ? " summary-row-total" : ""}"><span>${esc(label)}</span><span class="summary-row-value">${esc(value)}</span></div>`).join("");
  }
  const discountRows = result.discount > 0
    ? [["Descuento (" + num(result.discountPct, 2) + "%)", "− " + money(result.discount)], ["Precio con Descuento", money(result.afterDiscount)]]
    : [];
  els.summaryRows.innerHTML = [
    ["Sustrato", money(result.sustrato.subtotal)],
    ["Diseño", money(result.design.subtotal)],
    ["Preprensa", money(result.prepress.subtotal)],
    ["Planchas", money(result.plates.subtotal)],
    ["Impresión", money(result.print.subtotal)],
    ["Acabados", money(result.finishes.subtotal)],
    ["Empaque", money(result.packaging.subtotal)],
    ["Adicionales", money(result.additional.subtotal)],
    ["Costo Industrial Total", money(result.industrial)],
    ["Total con Ajustes", money(result.margin)],
    ...discountRows,
    ["IVA", money(result.tax)],
    ["Total Final", money(result.total)],
    ["Precio Unitario", money(result.unit)]
  ].map(([label, value]) => `<div class="summary-row${label === "Total Final" ? " summary-row-total" : ""}"><span>${esc(label)}</span><span class="summary-row-value">${esc(value)}</span></div>`).join("");
  renderSapPreview(result);
}

function buildSapPreviewPayloads(result) {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  const quote = state.context?.cotizacion || {};
  const frontBackGroup = currentFrontBackGroup();
  const salespersonName = first(quote.salesperson_name, state.form?.header?.salespersonName, state.context?.calculo?.salespersonName, "");
  const salespersonConfig = findSapSalespersonConfigByName(salespersonName);
  const salesPersonCode = salespersonConfig?.salesPersonCode ?? null;
  const profitCenterCode = first(salespersonConfig?.profitCenterCode, "");
  const productionCostCenterCode = first(state.sapProductionCostCenter?.defaultCostCenterCode, "");
  const material = findMaterial(state.form?.substrate?.materialId);
  const itemCode = first(state.context?.calculo?.productCode, state.form?.header?.lineCode, `PROD-${quoteCode}-${lineCode || "01"}`);
  const itemName = first(state.form?.header?.jobName, state.context?.calculo?.productName, itemCode);
  const quantity = n(currentQuantity(state.form), 0);
  const warehouse = first(state.context?.calculo?.raw_data?.BODEGA, "01");
  const bomComponents = [];
  const pushComponent = (sourceLabel, componentCode, componentName, componentQuantity, extra = {}) => {
    const itemQty = n(componentQuantity, 0);
    if (!componentCode || itemQty <= 0) return;
    bomComponents.push({
      LineNum: bomComponents.length,
      ItemCode: componentCode,
      ItemName: componentName || componentCode,
      Quantity: r(itemQty, 6),
      WarehouseCode: warehouse,
      Source: sourceLabel,
      ...extra
    });
  };

  if (material?.id) {
    pushComponent(
      "Sustrato",
      material.id,
      material.descripcion || material.nombre || material.id,
      first(result?.sustrato?.totalLengthFeet, result?.sustrato?.linealFeet, quantity)
    );
  }

  (result?.print?.items || []).forEach((printItem, index) => {
    const stage = state.form?.printStages?.[index] || {};
    const machine = findMachine(stage.machineId);
    const isDigitalMachine = isDigitalProductionMachine(machine);
    const cmykQuantity = isDigitalMachine
      ? Math.max(0, n(printItem?.digitalInkKg, 0) - n(printItem?.digitalWhiteKg, 0) - n(printItem?.digitalSpecialInkKg, 0))
      : n(printItem?.inkConsumption, 0);
    if (state.form?.header?.useCmyk && stage.inkMaterialId && cmykQuantity > 0) {
      const inkMaterial = findMaterial(stage.inkMaterialId);
      pushComponent(
        isDigitalMachine ? "Tintas Digitales CMYK" : "Tintas CMYK",
        stage.inkMaterialId,
        inkMaterial?.descripcion || inkMaterial?.nombre || stage.inkMaterialId,
        cmykQuantity,
        { UnitHint: isDigitalMachine ? "kg" : "lb" }
      );
    }
    const whiteQuantity = isDigitalMachine
      ? n(printItem?.digitalWhiteKg, 0)
      : r(n(printItem?.inkConsumptionPerColorLb, 0) * (state.form?.header?.doubleWhitePass ? 2 : 1), 6);
    if (state.form?.header?.useWhiteInk && stage.whiteInkMaterialId && whiteQuantity > 0) {
      const whiteMaterial = findMaterial(stage.whiteInkMaterialId);
      pushComponent(
        "Tinta Blanca",
        stage.whiteInkMaterialId,
        whiteMaterial?.descripcion || whiteMaterial?.nombre || stage.whiteInkMaterialId,
        whiteQuantity,
        { UnitHint: isDigitalMachine ? "kg" : "lb" }
      );
    }
    (printItem?.inlineItems || []).forEach((inlineItem) => {
      if (!inlineItem?.active || !inlineItem?.materialId) return;
      const inlineMaterial = findMaterial(inlineItem.materialId);
      pushComponent(
        inlineItem.label || inlineItem.key || "Acabado Inline",
        inlineItem.materialId,
        inlineMaterial?.descripcion || inlineMaterial?.nombre || inlineItem.materialId,
        first(inlineItem.materialConsumptionLb, inlineItem.materialBase, 0),
        { UnitHint: inlineItem.key === "barniz" ? "lb" : "base" }
      );
    });
  });

  (result?.finishes?.items || []).forEach((finish) => {
    if (!finish?.active || !finish?.materialId) return;
    const finishMaterial = findMaterial(finish.materialId);
    pushComponent(
      finish.processLabel || finish.processKey || "Acabado",
      finish.materialId,
      finishMaterial?.descripcion || finishMaterial?.nombre || finish.materialId,
      first(finish.materialConsumptionKg, finish.materialBase, 0)
    );
  });

  const orderPayload = {
    quoteCode,
    lineCode,
    target: {
      internalEndpoint: "/api/sap/mirror/export-order",
      sapObject: "oOrders",
      sapTables: "ORDR / RDR1"
    },
    config: {
      inventorySourceMode: first(state.config?.general?.inventorySourceMode, "local"),
      sapProvider: first(state.sapConfig?.config?.provider, "service-layer"),
      sapMode: first(state.sapConfig?.config?.mode, "demo")
    },
    payload: {
      DocNum: quoteCode && lineCode ? `${quoteCode}-${lineCode}` : "",
      CardCode: first(quote.customer_code, state.context?.calculo?.customerCode, ""),
      CardName: first(quote.customer_name, state.context?.calculo?.customerName, ""),
      DocDate: new Date().toISOString().slice(0, 10),
      DocDueDate: first(quote.due_on, new Date().toISOString().slice(0, 10)),
      Comments: quoteCode && lineCode ? `Preparado desde cotización ${quoteCode}, línea ${lineCode}` : "Preparado desde cálculo de flexografía",
      ...(salesPersonCode !== null ? { SalesPersonCode: salesPersonCode } : {}),
      DocumentLines: [{
        LineNum: 0,
        ItemCode: itemCode,
        ItemDescription: itemName,
        Quantity: quantity,
        Price: r(result.unit || 0, 6),
        LineTotal: r(result.total || 0, 6),
        WarehouseCode: warehouse,
        ...(profitCenterCode ? { CostingCode: profitCenterCode } : {})
      }]
    },
    source: {
      salespersonName,
      salesPersonCode,
      profitCenterCode,
      frontBackGroup
    }
  };

  const bomPayload = {
    quoteCode,
    lineCode,
    target: {
      internalEndpoint: "/api/sap/product-trees",
      sapObject: "oProductTrees",
      sapTables: "OITT / ITT1"
    },
    config: {
      classificationField: first(state.config?.general?.inventoryImportedClassificationField, "U_ClasificacionERP"),
      sapProvider: first(state.sapConfig?.config?.provider, "service-layer"),
      sapMode: first(state.sapConfig?.config?.mode, "demo")
    },
    payload: {
      DocNum: quoteCode && lineCode ? `${quoteCode}-${lineCode}-BOM` : "",
      ItemCode: itemCode,
      ProdName: itemName,
      PlannedQty: quantity,
      WarehouseCode: warehouse,
      Components: bomComponents
    }
  };

  const inventoryExitPayload = {
    quoteCode,
    lineCode,
    target: {
      internalEndpoint: "/api/sap/inventory/exit",
      sapObject: "oInventoryGenExit",
      sapTables: "OIGE / IGE1"
    },
    payload: {
      DocDate: new Date().toISOString().slice(0, 10),
      Comments: quoteCode && lineCode ? `Entrega de componentes desde cotización ${quoteCode}, línea ${lineCode}` : "Entrega de componentes desde cálculo de flexografía",
      ProductionItemCode: itemCode,
      ProductionQuantity: quantity,
      WarehouseCode: warehouse,
      DocumentLines: bomComponents.map((component, index) => ({
        LineNum: index,
        ItemCode: component.ItemCode,
        ItemDescription: component.ItemName,
        Quantity: component.Quantity,
        WarehouseCode: component.WarehouseCode || warehouse,
        ...(productionCostCenterCode ? { CostingCode: productionCostCenterCode } : {})
      }))
    },
    source: {
      productionCostCenterCode
    }
  };

  const inventoryEntryPayload = {
    quoteCode,
    lineCode,
    target: {
      internalEndpoint: "/api/sap/inventory/entry",
      sapObject: "oInventoryGenEntry",
      sapTables: "OIGN / IGN1"
    },
    payload: {
      DocDate: new Date().toISOString().slice(0, 10),
      Comments: quoteCode && lineCode ? `Terminación de producción desde cotización ${quoteCode}, línea ${lineCode}` : "Terminación de producción desde cálculo de flexografía",
      ProductionItemCode: itemCode,
      ProductionQuantity: quantity,
      WarehouseCode: warehouse,
      DocumentLines: [{
        LineNum: 0,
        ItemCode: itemCode,
        ItemDescription: itemName,
        Quantity: quantity,
        WarehouseCode: warehouse,
        ...(productionCostCenterCode ? { CostingCode: productionCostCenterCode } : {})
      }]
    },
    source: {
      productionCostCenterCode
    }
  };

  return { orderPayload, bomPayload, inventoryExitPayload, inventoryEntryPayload, bomComponents };
}

function renderSapPreview(result) {
  const { orderPayload, bomPayload, inventoryExitPayload, inventoryEntryPayload, bomComponents } = buildSapPreviewPayloads(result);
  if (els.sapPreviewSummary) {
    els.sapPreviewSummary.innerHTML = [
      ["Destino OV", `${orderPayload.target.sapObject} · ${orderPayload.target.sapTables}`],
      ["Destino BOM", `${bomPayload.target.sapObject} · ${bomPayload.target.sapTables}`],
      ["Destino salida", `${inventoryExitPayload.target.sapObject} · ${inventoryExitPayload.target.sapTables}`],
      ["Destino entrada", `${inventoryEntryPayload.target.sapObject} · ${inventoryEntryPayload.target.sapTables}`],
      ["Endpoint OV", orderPayload.target.internalEndpoint],
      ["Endpoint BOM", bomPayload.target.internalEndpoint],
      ["Endpoint salida", inventoryExitPayload.target.internalEndpoint],
      ["Endpoint entrada", inventoryEntryPayload.target.internalEndpoint],
      ["Vendedor", first(orderPayload.source?.salespersonName, "Pendiente")],
      ["Código vendedor SAP", first(orderPayload.source?.salesPersonCode, "Pendiente")],
      ["Centro beneficio OV", first(orderPayload.source?.profitCenterCode, "Pendiente")],
      ["Centro costo producción", first(inventoryExitPayload.source?.productionCostCenterCode, "Pendiente")],
      ["Corrida", orderPayload.source?.frontBackGroup ? `Frente/Dorso · ${orderPayload.source.frontBackGroup.role || ""}` : "Individual"],
      ["Fuente inventario", first(state.config?.general?.inventorySourceMode, "local")],
      ["Campo clasificación", first(state.config?.general?.inventoryImportedClassificationField, "U_ClasificacionERP")],
      ["Componentes BOM", String(bomComponents.length)],
      ["Bodega", first(orderPayload.payload.DocumentLines?.[0]?.WarehouseCode, "01")]
    ].map(([label, value]) => `<div class="summary-row"><span>${esc(label)}</span><span class="summary-row-value">${esc(value)}</span></div>`).join("");
  }
  if (els.sapPreviewOrder) {
    els.sapPreviewOrder.textContent = JSON.stringify(orderPayload, null, 2);
  }
  if (els.sapPreviewShipments) {
    els.sapPreviewShipments.textContent = JSON.stringify({
      inventoryExit: inventoryExitPayload,
      inventoryEntry: inventoryEntryPayload
    }, null, 2);
  }
  if (els.sapPreviewBom) {
    els.sapPreviewBom.textContent = JSON.stringify({
      bom: bomPayload,
      inventoryExit: inventoryExitPayload,
      inventoryEntry: inventoryEntryPayload
    }, null, 2);
  }
}

async function sendSapPreview() {
  ensureCalculationReadyForOutput();
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  if (!quoteCode || !lineCode) {
    throw new Error("Debes tener una cotización y una línea activas para enviar a SAP.");
  }
  const { orderPayload, bomPayload } = buildSapPreviewPayloads(totals());
  const orderResponse = await fetch("/api/sap/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload.payload)
  });
  const orderResult = await orderResponse.json().catch(() => ({}));
  if (!orderResponse.ok) {
    throw new Error(orderResult.error || "No fue posible enviar la orden real a SAP.");
  }
  const bomResponse = await fetch("/api/sap/mirror/export-bom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bomPayload.payload)
  });
  const bomMirrorResult = await bomResponse.json().catch(() => ({}));
  if (!bomResponse.ok) {
    throw new Error(bomMirrorResult.error || "La orden se envió, pero no fue posible preparar el BOM en espejo.");
  }
  const bomLiveResponse = await fetch("/api/sap/product-trees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bomPayload.payload)
  });
  const bomResult = await bomLiveResponse.json().catch(() => ({}));
  if (!bomLiveResponse.ok) {
    throw new Error(bomResult.error || "La orden se envió, pero no fue posible enviar el BOM real a SAP.");
  }
  els.calcStatus.textContent = `Orden enviada a SAP. Respuesta: ${first(orderResult.DocNum, orderResult.DocEntry, orderResult.message, "OK")} · BOM enviado ${first(bomResult.TreeCode, bomResult.DocNum, bomResult.DocEntry, bomResult.message, "OK")}.`;
  if (els.sapPreviewOrder) {
    els.sapPreviewOrder.textContent = JSON.stringify({
      request: orderPayload,
      response: orderResult
    }, null, 2);
  }
  if (els.sapPreviewShipments) {
    els.sapPreviewShipments.textContent = JSON.stringify({
      inventoryExit: "Preparado en la previsualización. No se envió movimiento de inventario desde este botón.",
      inventoryEntry: "Preparado en la previsualización. No se envió movimiento de inventario desde este botón."
    }, null, 2);
  }
  if (els.sapPreviewBom) {
    els.sapPreviewBom.textContent = JSON.stringify({
      request: bomPayload,
      response: bomResult,
      mirror: bomMirrorResult
    }, null, 2);
  }
  return { orderResult, bomResult, bomMirrorResult };
}

function openSapOutputView() {
  const target = "/configuracion-general?sap=1";
  if (!openRouteInShell(target, "Configuración SAP")) {
    window.location.href = withShellParam(target);
  }
}

function formatValidationMessageForProforma(validationState = refreshCalculationValidation()) {
  const issueMessages = summarizeIssuesByProcess(validationState?.issues || []).map((issue) => issue.message);
  const messages = uniqueMessages(issueMessages.length ? issueMessages : (validationState?.blockingMessages || []));
  if (!messages.length) return "";
  const detail = `${messages.slice(0, 4).join(" ")}${messages.length > 4 ? ` +${messages.length - 4} más.` : ""}`;
  return `No se puede abrir la proforma. En este cálculo faltan ${messages.length} dato(s): ${detail}`;
}

function extractStoredLineBlockMessage(line = {}) {
  const raw = line.raw_data || {};
  return String(
    raw["ANALISIS CAMPOS PDF"]
    || raw["ANALISIS CAMPOS CREAR ORDEN"]
    || raw["ANALISIS CAMPOS FINALIZAR"]
    || ""
  ).trim();
}

function processKeyFromIssueText(message = "") {
  const text = norm(message);
  if (!text) return "";
  const finishMatch = EXTERNAL_FINISH_SLOTS.find((slot) => {
    const label = norm(slot.label);
    return label && text.includes(label);
  });
  if (finishMatch) return finishMatch.key;
  const menuMatch = PROCESS_MENU.find((item) => {
    const label = norm(item.label);
    return label && text.includes(label);
  });
  return menuMatch?.key || "";
}

function activeProcessKeysFromStoredLine(line = {}) {
  const raw = line.raw_data || {};
  const uiState = raw.Estado_UI || {};
  const keys = new Set(Array.isArray(uiState.activeProcessKeys) ? uiState.activeProcessKeys : []);
  const uiFinishes = Array.isArray(uiState.finishes) ? uiState.finishes : [];
  const explicitFinishKeys = new Set(
    uiFinishes
      .filter((finish) => finish?.active !== false)
      .map((finish) => String(finish?.processKey || finish?.slotKey || finish?.key || "").trim())
      .filter((key) => EXTERNAL_FINISH_BY_KEY[key])
  );
  if (uiFinishes.length) {
    [...keys].forEach((key) => {
      if (EXTERNAL_FINISH_BY_KEY[key] && !explicitFinishKeys.has(key)) keys.delete(key);
    });
  }
  (Array.isArray(raw.Secuencia_Procesos) ? raw.Secuencia_Procesos : []).forEach((item) => {
    const key = processKeyFromAutoSnapshot(item?.processKey || item?.processName || item?.name || "");
    if (key && (!EXTERNAL_FINISH_BY_KEY[key] || !uiFinishes.length || explicitFinishKeys.has(key))) keys.add(key);
  });
  (Array.isArray(uiState.processSequence) ? uiState.processSequence : []).forEach((item) => {
    const key = processKeyFromAutoSnapshot(item?.processKey || item?.processName || item?.name || item || "");
    if (key && (!EXTERNAL_FINISH_BY_KEY[key] || !uiFinishes.length || explicitFinishKeys.has(key))) keys.add(key);
  });
  return keys;
}

function formatStoredLineBlockMessageForProforma(line = {}, quoteCode = "") {
  const lineCode = String(line.line_code || line.linea || line.raw_data?.["ID LINEA"] || "").trim();
  const message = extractStoredLineBlockMessage(line);
  if (!lineCode || !message) return "";
  const currentLineCode = String(state.form?.header?.lineCode || "").trim();
  if (lineCode === currentLineCode) {
    return `No se puede abrir la proforma. En este cálculo sucede el problema: ${esc(message)}`;
  }
  const route = buildLineCalculationRoute({
    lineCode,
    quoteCode,
    productId: line.product_code || "",
    department: line.department || line.raw_data?.DEPARTAMENTO || "Flexografia"
  });
  const lineLabel = route
    ? `<a class="summary-row-link" href="${esc(route)}" data-route="${esc(route)}" data-label="Cálculo ${esc(lineCode)}">${esc(lineCode)}</a>`
    : esc(lineCode);
  return `No se puede abrir la proforma. La línea ${lineLabel} requiere completar el cálculo: ${esc(message)}`;
}

function storedLineIssues(line = {}) {
  const raw = line.raw_data || {};
  const activeKeys = activeProcessKeysFromStoredLine(line);
  const messages = Array.isArray(raw.Mensajes_Validacion)
    ? raw.Mensajes_Validacion.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const fallback = extractStoredLineBlockMessage(line);
  return uniqueMessages(messages.length ? messages : (fallback ? [fallback] : []))
    .map((message) => ({ message, processKey: processKeyFromIssueText(message) }))
    .filter((issue) => {
      if (!EXTERNAL_FINISH_BY_KEY[issue.processKey]) return true;
      return !activeKeys.size || activeKeys.has(issue.processKey);
    });
}

async function findStoredProformaBlockLines(quoteCode) {
  if (!quoteCode) return [];
  try {
    const payload = await getJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}`);
    const lines = Array.isArray(payload?.lineas) ? payload.lineas : [];
    return lines
      .map((line) => ({ line, issues: storedLineIssues(line) }))
      .filter((item) => item.issues.length);
  } catch {
    return [];
  }
}

function buildCurrentLineBlockItem(validationState = state.processValidation) {
  const issues = Array.isArray(validationState?.issues) ? validationState.issues : [];
  if (!issues.length) return null;
  return {
    current: true,
    lineCode: String(state.form?.header?.lineCode || "actual").trim() || "actual",
    quoteCode: String(state.form?.header?.quoteCode || "").trim(),
    issues
  };
}

function buildStoredLineBlockItem(item = {}, quoteCode = "") {
  const line = item.line || {};
  const lineCode = String(line.line_code || line.linea || line.raw_data?.["ID LINEA"] || "").trim();
  if (!lineCode || !item.issues?.length) return null;
  return {
    current: lineCode === String(state.form?.header?.lineCode || "").trim(),
    lineCode,
    quoteCode,
    productId: line.product_code || "",
    department: line.department || line.raw_data?.DEPARTAMENTO || "Flexografia",
    issues: item.issues
  };
}

function lineBlockKey(item = {}) {
  return `${item.quoteCode || ""}::${item.lineCode || ""}`;
}

function mergeProformaBlockItems(currentItem, storedItems = [], quoteCode = "") {
  const map = new Map();
  if (currentItem) map.set(lineBlockKey(currentItem), currentItem);
  storedItems.map((item) => buildStoredLineBlockItem(item, quoteCode)).filter(Boolean).forEach((item) => {
    const key = lineBlockKey(item);
    if (map.has(key)) return;
    map.set(key, item);
  });
  return [...map.values()].sort((left, right) => Number(!left.current) - Number(!right.current));
}

function processLabelFromKey(processKey = "") {
  const baseKey = String(processKey || "").split("-")[0];
  return PROCESS_MENU_BY_KEY[baseKey]?.label || baseKey || "Faltante";
}

function summarizeIssuesByProcess(issues = []) {
  const map = new Map();
  (Array.isArray(issues) ? issues : []).forEach((issue) => {
    const processKey = String(issue?.processKey || processKeyFromIssueText(issue?.message || "") || "").trim();
    const label = processLabelFromKey(processKey);
    const key = processKey || String(issue?.message || "").trim();
    if (!key || map.has(key)) return;
    map.set(key, {
      ...issue,
      processKey,
      message: processKey ? `${label} requiere configuración.` : String(issue?.message || "").trim()
    });
  });
  return [...map.values()];
}

function buildProformaBlockMessage(items = []) {
  if (!items.length) return "";
  const lineCount = items.length;
  const rows = items.map((item) => {
    const route = item.current ? "" : buildLineCalculationRoute(item);
    const lineLabel = item.current
      ? `${esc(item.lineCode)} <span class="calc-center-message-meta">(actual)</span>`
      : `<a class="summary-row-link" href="${esc(route)}" data-route="${esc(route)}" data-label="Cálculo ${esc(item.lineCode)}">${esc(item.lineCode)}</a>`;
    const issues = summarizeIssuesByProcess(item.issues).map((issue) => {
      const label = processLabelFromKey(issue.processKey);
      const issueRoute = route && issue.processKey ? buildLineCalculationRoute({ ...item, processKey: issue.processKey }) : route;
      const problem = item.current && issue.processKey
        ? `<button type="button" class="calc-message-link" data-jump-process="${esc(issue.processKey)}">${esc(label)}</button>`
        : (issueRoute ? `<a class="summary-row-link" href="${esc(issueRoute)}" data-route="${esc(issueRoute)}" data-label="Cálculo ${esc(item.lineCode)}">${esc(label)}</a>` : esc(label));
      return `<li>${problem}: ${esc(issue.message)}</li>`;
    }).join("");
    return `<section class="calc-message-line"><div class="calc-message-line-head">Línea ${lineLabel}</div><ul>${issues}</ul></section>`;
  }).join("");
  return `<div class="calc-message-title">Faltantes en líneas de cálculo de esta proforma</div><div class="calc-message-intro">Esta proforma toma datos de ${lineCount} línea${lineCount === 1 ? "" : "s"} de cálculo. Completa o justifica cada faltante antes de continuar.</div><div class="calc-message-list">${rows}</div>`;
}

async function currentQuoteProformaBlockItems() {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  if (!quoteCode) return [];
  const validationState = refreshCalculationValidation();
  return mergeProformaBlockItems(
    buildCurrentLineBlockItem(validationState),
    await findStoredProformaBlockLines(quoteCode),
    quoteCode
  );
}

async function showQuoteProformaBlockMessageIfNeeded() {
  const blockMessage = buildProformaBlockMessage(await currentQuoteProformaBlockItems());
  if (!blockMessage) return false;
  showCenterMessage(blockMessage, { html: true, duration: 18000 });
  return true;
}

async function closeProformaForCurrentQuote(reason = "tracking_sent") {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  if (!quoteCode) throw new Error("Debes tener una cotización activa para cerrar la proforma.");
  await postJson(`/api/proformas/${encodeURIComponent(quoteCode)}/close`, { reason });
}

async function reopenProformaForCurrentQuote(reason = "tracking_reopened") {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  if (!quoteCode) return null;
  return postJson(`/api/proformas/${encodeURIComponent(quoteCode)}/reopen`, { reason });
}

function jumpToProcessIssue(processKey = "") {
  const key = String(processKey || "").trim();
  if (!key) return;
  const escapeSelector = window.CSS?.escape || ((value) => String(value).replace(/"/g, '\\"'));
  const card = document.querySelector(`.process-card[data-process-key="${escapeSelector(key)}"]`)
    || document.querySelector(`.process-card[data-process-key^="${escapeSelector(key.split("-")[0])}-"]`);
  if (!card) return;
  card.open = true;
  state.processOpen[card.dataset.processKey || key] = true;
  document.getElementById("calcCenterMessage")?.setAttribute("hidden", "");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function openProformaForCurrentQuote() {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  if (!quoteCode) {
    showCenterMessage("Debes tener una cotización activa para ver la proforma.");
    return;
  }
  const validationState = refreshCalculationValidation();
  const blockItems = mergeProformaBlockItems(
    buildCurrentLineBlockItem(validationState),
    await findStoredProformaBlockLines(quoteCode),
    quoteCode
  );
  const blockMessage = buildProformaBlockMessage(blockItems);
  if (blockMessage) {
    showCenterMessage(blockMessage, { html: true, duration: 18000 });
    return;
  }
  openAppRoute(`/proforma?codigo=${encodeURIComponent(quoteCode)}`, `Proforma ${quoteCode}`);
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

function renderPlateModeSelector() {
  const current = normalizePlateMode(state.form.plates?.plateMode);
  return `<div class="front-back-element-tabs plate-mode-tabs" role="tablist" aria-label="Tipo de plancha">${plateModeOptions().map((option) => `<button type="button" class="front-back-element-tab plate-mode-tab${current === option.key ? " is-active" : ""}" data-action="set-plate-mode" data-plate-mode="${esc(option.key)}" role="tab" aria-selected="${current === option.key ? "true" : "false"}"><strong>${esc(option.label)}</strong></button>`).join("")}</div>`;
}

function renderPlatePendingPanel() {
  return `<div class="plate-disabled-panel"><label class="inline-process-check plate-virgin-check"><input type="checkbox" disabled><span>Inventario / Costo Externo</span></label></div>`;
}

function renderPlateExternalAttachmentTable(item = {}, index = 0) {
  const fileName = String(item.attachmentName || "").trim();
  const attachIcon = iconPresentation("quoteRequestAttachment", "📎", "#1e516d", 18);
  const deleteIcon = iconPresentation("quoteRequestAttachmentDelete", "×", "#b94848", 18);
  const extension = fileName.includes(".") ? fileName.split(".").pop().slice(0, 5).toUpperCase() : "FILE";
  return `<div class="additional-attachments-card"><div class="additional-attachment-actions"><label class="additional-icon-action" title="Adjuntar archivo" aria-label="Adjuntar archivo" style="--icon-color:${esc(attachIcon.color)};--icon-hover-color:${esc(attachIcon.hover)};--config-icon-size:${attachIcon.size}px;">${renderIconMarkup(attachIcon.value, "Adjuntar archivo", "additional-attachment-icon")}<input data-scope="plates.external.${index}" data-field="attachmentName" data-kind="file" type="file"></label></div><div class="additional-attachment-list">${fileName ? `<div class="additional-attachment-card"><div class="additional-attachment-filetile"><strong>${esc(extension)}</strong><span>Adjunto</span></div><div class="additional-attachment-body"><span class="additional-attachment-name" title="${esc(fileName)}">${esc(fileName)}</span><span class="additional-attachment-size">Archivo asociado al costo externo</span></div><button type="button" class="additional-attachment-remove" data-action="clear-plate-external-attachment" data-index="${index}" aria-label="Eliminar adjunto" title="Eliminar adjunto" style="--icon-color:${esc(deleteIcon.color)};--icon-hover-color:${esc(deleteIcon.hover)};--config-icon-size:${deleteIcon.size}px;">${renderIconMarkup(deleteIcon.value, "Eliminar adjunto", "additional-attachment-delete-icon")}</button></div>` : `<div class="additional-attachment-empty">Sin adjuntos</div>`}</div></div>`;
}

function renderPlateExternalRow(item = {}, index = 0) {
  const deleteIcon = getProcessDeleteIconConfig();
  return `<div class="additional-item"><div class="additional-row"><input data-scope="plates.external.${index}" data-field="description" type="text" value="${esc(item.description || "")}" placeholder="Descripción">${displayInput(`plates.external.${index}`, "cost", item.cost || 0, { prefix: "$", maximumFractionDigits: 2, step: "0.01" })}<input data-scope="plates.external.${index}" data-field="comments" type="text" value="${esc(item.comments || "")}" placeholder="Comentarios"><button type="button" class="process-trash-button" data-action="remove-plate-external" data-index="${index}" aria-label="Eliminar fila" title="Eliminar fila" style="--process-delete-icon-color:${esc(deleteIcon.primary)};--process-delete-icon-hover:${esc(deleteIcon.hover)};--process-delete-icon-size:${deleteIcon.size}px;">${renderIconMarkup(deleteIcon.value, "Eliminar fila", "process-delete-icon")}</button></div>${renderPlateExternalAttachmentTable(item, index)}</div>`;
}

function renderPlateExternalPanel(plates) {
  const rows = normalizePlateExternalRows(state.form.plates.external);
  state.form.plates.external = rows;
  return `<div class="table-toolbar"><button type="button" class="inline-button" data-action="add-plate-external">Agregar fila</button></div><div class="additional-table plate-external-table"><div class="additional-head"><span>Descripción</span><span>Costo</span><span>Comentarios</span><span></span></div>${rows.map((item, index) => renderPlateExternalRow(item, index)).join("")}</div><div class="readonly-grid compact-top subtotal-right">${metric("Subtotal Planchas", money(plates.subtotal))}</div>${formula("Costo Externo", "Subtotal planchas = suma de costos externos registrados.", plates.explanation, {
    exampleLines: rows.map((row, index) => `Costo externo ${index + 1}: ${formulaValue(row.cost || 0, 2)}`),
    answer: `R/ El total a cobrar por planchas es ${money(plates.subtotal || 0)}`
  })}`;
}

function renderPlateInventoryPanel(plates) {
  return `<div class="plate-disabled-panel"><label class="inline-process-check plate-virgin-check"><input type="checkbox" checked disabled><span>Planchas en Inventario</span></label></div>`;
}

function renderPlateCreatePanel(plates) {
  return `<div class="process-zone"><div class="process-zone-head"><h4>Creación</h4></div>${PLATE_KEYS.map((entry) => renderPlateStep(entry, plates)).join("")}</div><div class="readonly-grid compact-top subtotal-right">${metric("Subtotal Planchas", money(plates.subtotal))}</div>`;
}

function renderPlateStep(entry, plates) {
  const item = state.form.plates[entry.key];
  const step = plates.breakdown[entry.key];
  const machineChoices = plateMachines(entry);
  const machineOptions = machineChoices.length ? machineChoices.map((machine) => ({ id: machine.id, nombre: machineDisplayName(machine) })) : [{ id: item.processId || entry.key, nombre: item.machineName || entry.machine }];
  const openKey = `plates.${entry.key}`;

  if (entry.materialOnly) {
    const laser = step.laserMetrics || laserPlateMetrics();
    const stockOptions = plateStockMaterials(item.processId).map((material) => ({ id: material.id, nombre: material.descripcion || material.nombre || material.codigo || material.id }));
    const titleMarkup = `<label class="inline-process-check plate-virgin-check"><input data-scope="plates" data-field="chargeVirginPlate" type="checkbox"${state.form.plates.chargeVirginPlate !== false ? " checked" : ""}><span>${esc(entry.label)}</span></label>`;
    const body = `<div class="editable-grid plate-grid plate-grid-virgin"><label class="span-2"><span>Tipo de Plancha</span><select class="${laser.missing.material ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="materialId">${processOptions(stockOptions, item.materialId)}</select></label><label><span>Costo por in²</span><input type="text" value="${laser.costPerIn2 > 0 ? `$${num(laser.costPerIn2, 4)}` : ""}" readonly></label><label><span>Subtotal Suministro</span><input type="text" value="${esc(money(step.materialSubtotal || 0))}" readonly></label></div><div class="readonly-grid compact-top plate-metrics-grid plate-metrics-grid-focus">${metricBox("Cantidad Planchas", laser.totalColors > 0 ? num(laser.totalColors, 0) : "Pendiente", laser.missing.totalColors, laser.hasAbsurdData)}${metricBox("Área por Plancha", laser.areaPerColor > 0 ? `${num(laser.areaPerColor, 4)} in²` : "Pendiente", laser.missing.mountWidthIn || laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Área Total", laser.totalArea > 0 ? `${num(laser.totalArea, 4)} in²` : "Pendiente", laser.missing.totalColors || laser.missing.mountWidthIn || laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Costo por in²", laser.costPerIn2 > 0 ? `$${num(laser.costPerIn2, 4)}` : "Pendiente", laser.missing.sheetCost, laser.hasAbsurdData)}${metricBox("Costo Total Plancha", step.materialSubtotal > 0 ? money(step.materialSubtotal) : "Pendiente", laser.missing.sheetCost || laser.totalArea <= 0, laser.hasAbsurdData)}</div>${formula(entry.label, step.formulaText, step.explanation, {
      exampleLines: [
        `Costo Plancha Virgen: ${formulaValue(laser.totalArea, 2)} x ${formulaValue(laser.costPerIn2, 4)} = ${formulaValue(step.materialSubtotal || 0, 2)}`
      ],
      answer: `R/ El total a cobrar por plancha virgen es ${money(step.subtotal || 0)}`
    })}`;
    return subprocessCard(openKey, titleMarkup, step.subtotal, body, "plate-virgin-card", false);
  }

  if (entry.key !== "laser") {
    const body = `<div class="editable-grid plate-grid"><label class="span-2"><span>Máquina</span><select data-scope="plates.${entry.key}" data-field="processId">${processOptions(machineOptions, item.processId)}</select></label><label><span>Tiempo Proceso</span>${displayInput(`plates.${entry.key}`, "fixedMinutes", item.fixedMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Costo Hora Máquina</span>${displayInput(`plates.${entry.key}`, "costHourMachine", item.costHourMachine, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Costo Hora Hombre</span>${displayInput(`plates.${entry.key}`, "costHourOperator", item.costHourOperator, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Subtotal</span><input type="text" value="${esc(money(step.subtotal))}" readonly></label></div><div class="readonly-grid compact-top step-metrics">${metric("Tiempo", `${num(step.hours, 2)} h`)}${metric("Costo Máquina", money(step.machineSubtotal))}${metric("Costo Hombre", money(step.operatorSubtotal))}${metric("Subtotal", money(step.subtotal))}</div>${formula(entry.label, step.formulaText, step.explanation, {
      exampleLines: [
        `Tiempo ${entry.label}: ${formulaValue(item.fixedMinutes, 2)} / 60 = ${formulaValue(step.hours, 2)} h`,
        `Subtotal ${entry.label}: (${formulaValue(step.hours, 2)} x ${formulaValue(item.costHourMachine, 2)}) + (${formulaValue(step.hours, 2)} x ${formulaValue(item.costHourOperator, 2)}) = ${formulaValue(step.subtotal, 2)}`
      ],
      answer: `R/ El total a cobrar por ${entry.label.toLowerCase()} es ${money(step.subtotal || 0)}`
    })}`;
    return subprocessCard(openKey, esc(entry.label), step.subtotal, body, "", false);
  }

  const laser = step.laserMetrics || laserPlateMetrics();
  const stockOptions = plateStockMaterials(item.processId).map((material) => ({ id: material.id, nombre: material.descripcion || material.nombre || material.codigo || material.id }));
  const body = `<div class="editable-grid plate-grid plate-grid-laser"><label class="span-2"><span>Máquina</span><select class="${laser.missing.machine ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="processId">${processOptions(machineOptions, item.processId)}</select></label><label class="span-2"><span>Plancha Virgen</span><select class="${laser.missing.material ? "field-required-input" : ""}" data-scope="plates.${entry.key}" data-field="materialId">${processOptions(stockOptions, item.materialId)}</select></label><label><span>Planchas por Hora</span>${displayInput(`plates.${entry.key}`, "speed", item.speed, { suffix: "pl/h", maximumFractionDigits: 4 })}</label><label><span>Costo Hora Máquina</span>${displayInput(`plates.${entry.key}`, "costHourMachine", item.costHourMachine, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Costo Hora Hombre</span>${displayInput(`plates.${entry.key}`, "costHourOperator", item.costHourOperator, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Margen Pegado</span>${displayInput(`plates.${entry.key}`, "safetyMarginIn", item.safetyMarginIn, { suffix: "in", maximumFractionDigits: 4 })}</label></div><div class="readonly-grid compact-top plate-metrics-grid plate-metrics-grid-focus">${metricBox("Tintas Activas", laser.totalColors > 0 ? num(laser.totalColors, 0) : "Pendiente", laser.missing.totalColors, laser.hasAbsurdData)}${metricBox("Área por Color", laser.areaPerColor > 0 ? `${num(laser.areaPerColor, 4)} in²` : "Pendiente", laser.missing.mountWidthIn || laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Área Total", laser.totalArea > 0 ? `${num(laser.totalArea, 4)} in²` : "Pendiente", laser.missing.totalColors || laser.missing.mountWidthIn || laser.missing.mountLengthIn || laser.missing.elongationPct, laser.hasAbsurdData)}${metricBox("Área Procesada por Hora", laser.processedAreaPerHour > 0 ? `${num(laser.processedAreaPerHour, 0)} in²` : "Pendiente", laser.missing.speed || laser.missing.sheetAreaIn2, laser.hasAbsurdData)}${metricBox("Tiempo Total", laser.totalMinutes > 0 ? `${num(laser.totalMinutes, 2)} min` : "Pendiente", laser.missing.speed || laser.missing.sheetAreaIn2, laser.hasAbsurdData)}</div><div class="readonly-grid compact-top step-metrics">${metric("Costo Máquina", money(step.machineSubtotal))}${metric("Costo Hombre", money(step.operatorSubtotal))}${metric("Subtotal", money(step.subtotal))}</div>${formula(entry.label, step.formulaText, step.explanation, {
    exampleLines: [
      `Tiempo ${entry.label}: ${formulaValue(laser.totalArea, 2)} / ${formulaValue(laser.processedAreaPerHour, 2)} = ${formulaValue(step.hours, 2)} h`,
      `Subtotal ${entry.label}: (${formulaValue(step.hours, 2)} x ${formulaValue(item.costHourMachine, 2)}) + (${formulaValue(step.hours, 2)} x ${formulaValue(item.costHourOperator, 2)}) = ${formulaValue(step.subtotal, 2)}`
    ],
    answer: `R/ El total a cobrar por ${entry.label.toLowerCase()} es ${money(step.subtotal || 0)}`
  })}`;
  return subprocessCard(openKey, esc(entry.label), step.subtotal, body, "", false);
}

function varnishProfileInfo(stage = {}) {
  const profiles = Array.isArray(stage.inkProfiles) ? stage.inkProfiles : [];
  const index = profiles.findIndex((row) => norm(row?.tipo).includes("barniz"));
  const defaults = conventionalInkDefaults();
  const profile = index >= 0 ? profiles[index] : {
    tipo: "Barniz UV",
    bcm: defaults.barnizBcm,
    coveragePct: defaults.barnizCoveragePct,
    gsm: defaults.barnizGsm
  };
  return {
    index,
    tipo: first(profile?.tipo, "Barniz UV"),
    bcm: n(profile?.bcm, defaults.barnizBcm),
    coveragePct: n(profile?.coveragePct, defaults.barnizCoveragePct),
    gsm: n(profile?.gsm, defaults.barnizGsm)
  };
}

function renderVarnishProfile(stageScope, stage) {
  const profile = varnishProfileInfo(stage);
  const scope = profile.index >= 0 ? `${stageScope}.inkProfiles.${profile.index}` : "";
  const readOnlyAttrs = scope ? "" : " readonly";
  const dataAttrs = (field) => scope ? `data-scope="${esc(scope)}" data-field="${esc(field)}"` : "";
  return `<div class="process-inline-table-shell varnish-profile-shell"><div class="ink-profile-table varnish-profile-table"><div class="ink-profile-head ink-profile-row"><span>Tipo de Trabajo</span><span>BCM</span><span>Cobertura %</span><span>GSM</span></div><div class="ink-profile-row"><input ${dataAttrs("tipo")} type="text" value="${esc(profile.tipo)}"${readOnlyAttrs}><input ${dataAttrs("bcm")} type="number" step="0.01" value="${esc(profile.bcm)}"${readOnlyAttrs}><input ${dataAttrs("coveragePct")} type="number" step="0.01" value="${esc(profile.coveragePct)}"${readOnlyAttrs}><input ${dataAttrs("gsm")} type="number" step="0.01" value="${esc(profile.gsm)}"${readOnlyAttrs}></div></div></div>`;
}

function normalizeNumberingAttachments(item = {}) {
  const items = Array.isArray(item.attachments) ? item.attachments : [];
  const normalized = items
    .map((attachment) => ({
      id: String(attachment?.id || "").trim(),
      fileName: String(attachment?.fileName || attachment?.name || "").trim(),
      notes: String(attachment?.notes || "Numerado").trim()
    }))
    .filter((attachment) => attachment.fileName && norm(attachment.notes || "Numerado").includes("numer"));
  const legacyName = String(item.attachmentName || "").trim();
  if (legacyName && !normalized.some((attachment) => attachment.fileName === legacyName)) {
    normalized.push({ id: "", fileName: legacyName, notes: "Numerado" });
  }
  return normalized;
}

function numberingAttachmentField(scope, item = {}) {
  const attachments = normalizeNumberingAttachments(item);
  const attachIcon = iconPresentation("quoteRequestAttachment", "📎", "#1e516d", 18);
  const deleteIcon = iconPresentation("quoteRequestAttachmentDelete", "×", "#b94848", 18);
  const rows = attachments.length ? attachments : [{ fileName: "" }];
  const needsEmptyRow = attachments.length && attachments.every((attachment) => String(attachment.fileName || attachment.name || "").trim());
  if (needsEmptyRow) rows.push({ fileName: "" });
  return `<div class="span-4 numbering-attachment-table"><div class="numbering-attachment-head"><span>Adjunto</span><span>Archivo</span><span></span></div>${rows.map((attachment, index) => {
    const fileName = String(attachment.fileName || attachment.name || "").trim();
    return `<div class="numbering-attachment-row"><label class="numbering-attachment-upload" title="Adjuntar archivo" aria-label="Adjuntar archivo" style="--icon-color:${esc(attachIcon.color)};--icon-hover-color:${esc(attachIcon.hover)};--config-icon-size:${attachIcon.size}px;">${renderIconMarkup(attachIcon.value, "Adjuntar archivo", "numbering-attachment-icon")}<input data-scope="${scope}" data-field="numberingAttachment" data-kind="file" data-numbering-attachment-index="${index}" type="file" accept=".xls,.xlsx,.csv,.pdf,image/*"></label><span class="numbering-attachment-name" title="${esc(fileName || "Sin adjunto")}">${esc(fileName || "Sin adjunto")}</span><span class="numbering-attachment-actions">${fileName ? `<button type="button" data-action="clear-numbering-attachment" data-scope="${scope}" data-index="${index}" aria-label="Eliminar adjunto" title="Eliminar adjunto" style="--icon-color:${esc(deleteIcon.color)};--icon-hover-color:${esc(deleteIcon.hover)};--config-icon-size:${deleteIcon.size}px;">${renderIconMarkup(deleteIcon.value, "Eliminar adjunto", "numbering-attachment-delete-icon")}</button>` : ""}</span></div>`;
  }).join("")}</div>`;
}

function renderAdditionalAttachmentTable(item = {}, index = 0) {
  const fileName = String(item.attachmentName || "").trim();
  const attachIcon = iconPresentation("quoteRequestAttachment", "📎", "#1e516d", 18);
  const deleteIcon = iconPresentation("quoteRequestAttachmentDelete", "×", "#b94848", 18);
  const extension = fileName.includes(".") ? fileName.split(".").pop().slice(0, 5).toUpperCase() : "FILE";
  return `<div class="additional-attachments-card"><div class="additional-attachment-actions"><label class="additional-icon-action" title="Adjuntar archivo" aria-label="Adjuntar archivo" style="--icon-color:${esc(attachIcon.color)};--icon-hover-color:${esc(attachIcon.hover)};--config-icon-size:${attachIcon.size}px;">${renderIconMarkup(attachIcon.value, "Adjuntar archivo", "additional-attachment-icon")}<input data-scope="additional.${index}" data-field="attachmentName" data-kind="file" type="file"></label></div><div class="additional-attachment-list">${fileName ? `<div class="additional-attachment-card"><div class="additional-attachment-filetile"><strong>${esc(extension)}</strong><span>Adjunto</span></div><div class="additional-attachment-body"><span class="additional-attachment-name" title="${esc(fileName)}">${esc(fileName)}</span><span class="additional-attachment-size">Archivo asociado al proceso adicional</span></div><button type="button" class="additional-attachment-remove" data-action="clear-additional-attachment" data-index="${index}" aria-label="Eliminar adjunto" title="Eliminar adjunto" style="--icon-color:${esc(deleteIcon.color)};--icon-hover-color:${esc(deleteIcon.hover)};--config-icon-size:${deleteIcon.size}px;">${renderIconMarkup(deleteIcon.value, "Eliminar adjunto", "additional-attachment-delete-icon")}</button></div>` : `<div class="additional-attachment-empty">Sin adjuntos</div>`}</div></div>`;
}

function renderAdditionalProcessRow(item = {}, index = 0) {
  return `<div class="additional-item"><div class="additional-row"><input data-scope="additional.${index}" data-field="description" type="text" value="${esc(item.description || "")}">${displayInput(`additional.${index}`, "cost", item.cost || 0, { prefix: "$", maximumFractionDigits: 2, step: "0.01" })}<input data-scope="additional.${index}" data-field="comments" type="text" value="${esc(item.comments || "")}"><button type="button" class="process-trash-button" data-action="remove-additional" data-index="${index}" aria-label="Eliminar fila" title="Eliminar fila"><span class="process-delete-icon" aria-hidden="true">&#128465;</span></button></div>${renderAdditionalAttachmentTable(item, index)}</div>`;
}

function renderNumberingFields(scope, item = {}) {
  const numberingType = normalizeNumberingType(item.numberingType, item.rangeFrom, item.rangeTo);
  return `<label><span>Tipo Numerado</span><select data-scope="${scope}" data-field="numberingType">${processOptionsStrict(numberingTypeOptions(), numberingType)}</select></label><label><span>Tiempo Montaje</span>${displayInput(scope, "setupMinutes", item.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Costo Fijo</span>${displayInput(scope, "fixedCost", item.fixedCost, { prefix: "$", maximumFractionDigits: 2 })}</label>`;
}

function renderInlinePrintBlock(stage, stageIndex, inline) {
  const materialOptions = materialsByClassification(inline.materialFamily, inline.materialKeywords || []).map((item) => ({ id: item.id, nombre: item.descripcion || item.nombre || item.id }));
  const scope = `printStages.${stageIndex}.inlineFinishes.${inline.key}`;
  const stageScope = `printStages.${stageIndex}`;
  const commentField = inline.key === "numerado"
    ? `<label class="span-4 comment-wide"><span>Comentario Interno</span><input data-scope="${scope}" data-field="comment" type="text" value="${esc(inline.comment || "")}"></label>`
    : `<label class="span-4 comment-wide"><span>Comentario</span><input data-scope="${scope}" data-field="comment" type="text" value="${esc(inline.comment || "")}"></label>`;
  const materialSelect = (label = "Material", span = "span-3") => `<label class="${span}"><span>${label}</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, inline.materialId)}</select></label>`;
  let fields = "";
  let extraConfig = "";
  const externalConfig = externalConfigForInlineFinish(inline.key);
  if (externalConfig) {
    const isInlineDie = externalConfig.key === "troquelado";
    const materialFields = [];
    const plateFields = [];
    const processFields = [
      `<label><span>Montaje <span class="field-unit">min</span></span>${displayInput(scope, "setupMinutes", inline.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label>`,
      ...(isInlineDie ? [] : [
        `<label><span>Velocidad <span class="field-unit">ft/min</span></span>${displayInput(scope, "speed", inline.speed, { suffix: "ft/min", maximumFractionDigits: 4 })}</label>`,
        `<label><span>Costo Máquina <span class="field-unit">$/h</span></span>${displayInput(scope, "costHourMachine", inline.costHourMachine, { prefix: "$", maximumFractionDigits: 2 })}</label>`,
        `<label><span>Costo Operador <span class="field-unit">$/h</span></span>${displayInput(scope, "costHourOperator", inline.operatorHourCost || inline.costHourOperator, { prefix: "$", maximumFractionDigits: 2 })}</label>`
      ]),
      `<label><span>Merma Ajuste <span class="field-unit">ft</span></span>${displayInput(scope, "setupWasteFeet", inline.setupWasteFeet, { suffix: "ft", maximumFractionDigits: 2 })}</label>`,
      ...(isInlineDie ? [] : [`<label><span>Merma Operación <span class="field-unit">%</span></span>${displayInput(scope, "operationWastePct", inline.operationWastePct, { suffix: "%", maximumFractionDigits: 2 })}</label>`])
    ];
    if (inline.key === "barniz") {
      processFields.push(`<label class="inline-process-check inline-field-check"><input data-scope="${scope}" data-field="sonified" type="checkbox"${inline.sonified ? " checked" : ""}><span>Zonificado</span></label>`);
    }
    if (externalConfig.key === "troquelado" && !isInlineDie) {
      processFields.push(`<label><span>Costo Lineal</span>${displayInput(scope, "variableUnitCost", inline.variableUnitCost, { prefix: "$", maximumFractionDigits: 6 })}</label>`);
      if (n(inline.fixedCost, 0) > 0) processFields.push(`<label><span>Costo Base</span>${displayInput(scope, "fixedCost", inline.fixedCost, { prefix: "$", maximumFractionDigits: 2 })}</label>`);
    }
    if (externalConfig.usesWeightMaterial) {
      materialFields.push(
        materialSelect("Material", "span-2"),
        `<label><span>Rendimiento <span class="field-unit">g/ft²</span></span>${displayInput(scope, "layerGft2", inline.layerGft2, { maximumFractionDigits: 6 })}</label>`,
        `<label><span>Costo Kg <span class="field-unit">$/kg</span></span>${displayInput(scope, "costPerKg", inline.costPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label>`
      );
    } else if (externalConfig.usesUnitMaterial) {
      materialFields.push(materialSelect("Material", "span-2"), `<label><span>Costo Unidad <span class="field-unit">$</span></span>${displayInput(scope, "costPerUnit", inline.costPerUnit, { prefix: "$", maximumFractionDigits: 6 })}</label>`);
    } else if (externalConfig.usesMaterial) {
      materialFields.push(materialSelect("Material", "span-2"), `<label><span>Costo ft² <span class="field-unit">$/ft²</span></span>${displayInput(scope, "costPerFt2", inline.costPerFt2, { prefix: "$", maximumFractionDigits: 6 })}</label>`);
    }
    if (externalConfig.usesPlateCost && !isInlineDie) {
      plateFields.push(
        `<label><span>Ancho Cliché <span class="field-unit">in</span></span>${displayInput(scope, "plateWidthIn", inline.plateWidthIn, { suffix: "in", maximumFractionDigits: 4 })}</label>`,
        `<label><span>Largo Cliché <span class="field-unit">in</span></span>${displayInput(scope, "plateLengthIn", inline.plateLengthIn, { suffix: "in", maximumFractionDigits: 4 })}</label>`,
        `<label><span>Costo Cliché <span class="field-unit">$</span></span>${displayInput(scope, "plateCost", inline.plateCost, { prefix: "$", maximumFractionDigits: 2 })}</label>`
      );
    }
    fields = `${processFields.join("")}${plateFields.join("")}${materialFields.join("")}${commentField}`;
  } else if (inline.key === "numerado") {
    fields = `${renderNumberingFields(scope, inline)}${commentField}${numberingAttachmentField(scope, inline)}`;
  } else {
    fields = `<label class="span-2"><span>Tiempo Montaje</span>${displayInput(scope, "setupMinutes", inline.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label>${inline.usesMaterial ? `${materialSelect("Material")}<label><span>Costo por Pie</span>${displayInput(scope, "costPerFoot", inline.costPerFoot, { prefix: "$", maximumFractionDigits: 6 })}</label>` : ""}${inline.usesPlateCost ? `<label class="span-2"><span>Costo Cliché</span>${displayInput(scope, "plateCost", inline.plateCost, { prefix: "$", maximumFractionDigits: 2 })}</label>` : ""}${commentField}`;
  }
  const configZone = `<div class="process-zone"><div class="process-zone-head"><h4>Parámetros de Configuración</h4></div><div class="process-finish-grid">${fields}</div>${extraConfig}</div>`;
  const numberingSummary = inline.key === "numerado"
    ? `${metric("Tipo", esc(normalizeNumberingType(inline.numberingType, inline.rangeFrom, inline.rangeTo) || "Sin definir"))}${isConsecutiveNumbering(normalizeNumberingType(inline.numberingType, inline.rangeFrom, inline.rangeTo)) ? metric("Rango", esc([inline.rangeFrom, inline.rangeTo].filter(Boolean).join(" - ") || "Sin rango")) : ""}${metric("Adjunto", esc(inline.attachmentName || "Sin adjunto"))}`
    : "";
  const barnizSummary = `${inline.sonified ? metric("Zonificado", "Sí") : ""}${metric("Consumo Barniz", `${num(inline.materialConsumptionLb || 0, 4)} lb`)}${metric("GSM Barniz", num(inline.layerGsm || 0, 4))}${metric("Subtotal Material", money(inline.materialSubtotal))}${metric("Subtotal", money(inline.subtotal))}`;
  const standardSummary = `${metric("Tiempo Montaje", `${num(inline.setupMinutes, 2)} min`)}${inline.usesMaterial ? metric("Material", esc(inline.materialName || "Sin definir")) : ""}${inline.usesMaterial ? metric("Subtotal Material", money(inline.materialSubtotal)) : ""}${inline.usesPlateCost ? metric("Costo Cliché", money(inline.plateCost)) : ""}${numberingSummary}${metric("Subtotal", money(inline.subtotal))}`;
  const inlineDieSummary = [
    metric("Tiempo Montaje", `${num(inline.setupMinutes || 0, 2)} min`),
    metric("Merma Ajuste", `${num(inline.setupWasteFeet || 0, 2)} ft`),
    metric("Subtotal", money(inline.subtotal))
  ].join("");
  const externalSummary = externalConfig ? (inline.key === "troquelado" ? inlineDieSummary : [
    metric("Base de Corrida", `${num(inline.calcBase || 0, 2)} pies`),
    metric("Tiempo Total", `${num(inline.totalMinutes || 0, 2)} min`),
    inline.usesMaterial ? metric("Material", esc(inline.materialName || "Sin definir")) : "",
    inline.usesMaterial ? metric("Base Material", `${num(inline.materialBase || 0, 2)} ft²`) : "",
    inline.usesWeightMaterial ? metric("Consumo Material", `${num(inline.materialConsumptionKg || 0, 4)} kg`) : "",
    inline.usesMaterial ? metric("Subtotal Material", money(inline.materialSubtotal)) : "",
    inline.usesPlateCost ? metric("Costo Cliché", money(inline.plateCost)) : "",
    inline.key === "troquelado" ? metric("Costo Lineal", money(inline.linearSubtotal || 0)) : "",
    metric("Subtotal", money(inline.subtotal))
  ].join("")) : "";
  const inlineFormulaPlateTerm = externalConfig?.usesPlateCost || inline.usesPlateCost ? " + Costo Cliché" : "";
  const inlineFormulaPlateExample = externalConfig?.usesPlateCost || inline.usesPlateCost ? ` + Costo Cliché ${formulaValue(inline.plateCost || 0, 2)}` : "";
  const metricsZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Resumen</h4></div><div class="process-kpi-grid">${externalConfig ? externalSummary : inline.key === "barniz" ? barnizSummary : standardSummary}</div></div>`;
  const formulaText = externalConfig && inline.key === "troquelado"
    ? "Troquelado en línea = tiempo de montaje y merma de ajuste dentro del proceso de impresión."
    : externalConfig
    ? `Subtotal ${inline.label} = Costo Máquina + Costo Operador + Costo Material${inlineFormulaPlateTerm} + Costo Fijo.`
    : inline.key === "barniz"
    ? "Subtotal Barniz = Costo Tiempo Montaje + Subtotal Material + Costos Únicos."
    : `Subtotal ${inline.label} = Costo Tiempo Montaje + Subtotal Material${inlineFormulaPlateTerm} + Costo Fijo.`;
  const formulaExplanation = externalConfig && inline.key === "troquelado"
    ? "El troquelado en línea no agrega costo externo ni costo lineal; su tiempo se suma al montaje de impresión y su merma de ajuste al consumo de sustrato."
    : externalConfig
    ? "El acabado en línea usa la misma base de corrida, merma, consumo de material y desglose de costos que el acabado externo equivalente."
    : inline.key === "barniz"
    ? `Consumo Barniz = Área Impresa x Cobertura Barniz x GSM Barniz / 453.59237. Costo Insumos Barniz = Consumo Barniz x Costo Libra. ${inline.explanation || ""}`
    : inline.explanation || "";
  const info = formulaButton(`Cálculo ${inline.label}`, formulaText, formulaExplanation, {
    exampleLines: [
      inline.key === "troquelado"
        ? `Montaje ${formulaValue(inline.setupMinutes || 0, 2)} min + Merma Ajuste ${formulaValue(inline.setupWasteFeet || 0, 2)} ft`
        : `Subtotal ${inline.label}: Costo Máquina ${formulaValue(inline.machineSubtotal || 0, 2)} + Costo Operador ${formulaValue(inline.operatorSubtotal || inline.setupCost || 0, 2)} + Subtotal Material ${formulaValue(inline.materialSubtotal || 0, 2)}${inlineFormulaPlateExample} + Costo Fijo ${formulaValue(inline.fixedCost || 0, 2)} = ${formulaValue(inline.subtotal || 0, 2)}`
    ],
    answer: inline.key === "troquelado"
      ? `R/ El troquelado en línea no agrega costo externo; consume ${num(inline.setupWasteFeet || 0, 2)} ft de merma de ajuste.`
      : `R/ El total a cobrar por ${inline.label.toLowerCase()} es ${money(inline.subtotal || 0)}`
  });
  return `<details class="subprocess-card inline-process-card" data-open-key="${esc(scope)}"><summary class="inline-process-summary"><div class="inline-process-heading"><label class="inline-process-check"><input data-scope="printStages.${stageIndex}.inlineFinishes.${inline.key}" data-field="active" type="checkbox"${inline.active ? " checked" : ""}><span>${esc(inline.label)}</span></label></div><div class="process-summary-side"><em>${money(inline.subtotal)}</em>${info}</div></summary><div class="process-body"><div class="process-layout process-layout-inline"><div class="process-layout-main">${configZone}</div><div class="process-layout-side">${metricsZone}</div></div></div></details>`;
}

function renderInlineToggleBar(stageIndex, inlineItems) {
  return `<div class="inline-toggle-bar">${inlineItems.map((inline) => `<label class="inline-toggle-chip"><input data-scope="printStages.${stageIndex}.inlineFinishes.${inline.key}" data-field="active" type="checkbox"${inline.active ? " checked" : ""}><span>${esc(inline.label)}</span></label>`).join("")}</div>`;
}

function renderPrintInkBlock(scope, item, printItem) {
  const info = formulaButton("Cálculo de Tinta Convencional", "Consumo Tinta = Área Impresa x Cobertura x BCM Anilox x Factor Transferencia x Densidad x Tintas Requeridas. Subtotal Tinta = Consumo Tinta x Costo por Libra.", "El consumo se calcula con el área impresa actual y el costo se obtiene multiplicando las libras consumidas por el costo de la tinta seleccionada.", {
    exampleLines: [
      `Área impresa: ${formulaValue(printItem.printedAreaFt2 || 0, 4)} ft² = ${formulaValue((printItem.printedAreaFt2 || 0) * 144, 4)} in²`,
      `Consumo por tinta: ${formulaValue((printItem.inkConsumptionPerColorLb || 0), 6)} lb`,
      `Consumo total: ${formulaValue(printItem.inkConsumption || 0, 6)} lb x ${formulaValue(printItem.inkCostPerLb || 0, 4)} = ${formulaValue(printItem.inkSubtotal || 0, 2)}`
    ],
    answer: `R/ El total de tinta convencional calculado es ${money(printItem.inkSubtotal || 0)}.`
  });
  const tintaOptions = conventionalInkMaterialOptions().map((entry) => ({ id: entry.id, nombre: entry.descripcion || entry.nombre || entry.id }));
  const tintaBlancaOptions = whiteInkMaterialOptions().map((entry) => ({ id: entry.id, nombre: entry.descripcion || entry.nombre || entry.id }));
  const tintaSelectors = `<label class="span-2"><span>Tinta CMYK UV</span><select data-scope="${scope}" data-field="inkMaterialId">${processOptions(tintaOptions, item.inkMaterialId)}</select></label>${state.form.header.useWhiteInk ? `<label class="span-2"><span>Tinta Blanca</span><select data-scope="${scope}" data-field="whiteInkMaterialId">${processOptions(tintaBlancaOptions, item.whiteInkMaterialId)}</select></label>` : ""}`;
  const parameterZone = `<div class="process-zone"><div class="process-zone-head"><h4>Parámetros de Tinta</h4></div><div class="process-print-grid process-print-grid-ink">${tintaSelectors}<label><span>Cobertura Tinta</span>${displayInput(scope, "coveragePct", item.coveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>Cobertura Diseño</span>${displayInput(scope, "designCoveragePct", item.designCoveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>BCM Anilox</span>${displayInput(scope, "aniloxBcm", item.aniloxBcm, { maximumFractionDigits: 4 })}</label><label><span>Factor Transferencia</span>${displayInput(scope, "transferFactor", item.transferFactor, { maximumFractionDigits: 4 })}</label><label><span>Densidad Tinta</span>${displayInput(scope, "inkDensity", item.inkDensity, { maximumFractionDigits: 4 })}</label><label><span>Costo Lb CMYK</span>${displayInput(scope, "inkCostPerLb", item.inkCostPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label><label><span>Costo Lb Blanco</span>${displayInput(scope, "whiteInkCostPerLb", item.whiteInkCostPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label><label><span>Costo Lb Pantone</span>${displayInput(scope, "pantoneInkCostPerLb", item.pantoneInkCostPerLb, { prefix: "$", maximumFractionDigits: 4 })}</label></div></div>`;
  const profileZone = `<div class="process-zone"><div class="process-zone-head"><h4>Tipos de Trabajo</h4></div><div class="process-inline-table-shell">${renderInkProfiles(scope, item.inkProfiles || [])}</div></div>`;
  return `<details class="subprocess-card inline-process-card print-ink-card" data-open-key="${esc(scope)}.ink"><summary class="inline-process-summary"><div class="inline-process-heading"><strong>Cálculo de Tinta Convencional</strong></div><div class="process-summary-side"><em>${money(printItem.inkSubtotal || 0)}</em>${info}</div></summary><div class="process-body">${parameterZone}${profileZone}<div class="readonly-grid compact-top step-metrics">${metric("Tintas Requeridas", num(printItem.colors || 0, 0))}${metric("Consumo Tinta", `${num(printItem.inkConsumption || 0, 4)} lb`)}${metric("Costo por Lb", money(printItem.inkCostPerLb || 0))}${metric("Subtotal Tinta", money(printItem.inkSubtotal || 0))}</div></div></details>`;
}

function renderDigitalPremierBlock(scope, item, printItem) {
  const material = findMaterial(state.form.substrate.materialId);
  const pretreated = materialPremierPreapplied(material);
  const treatmentDisabled = pretreated ? " disabled" : "";
  const premierZone = `<div class="process-zone"><div class="process-zone-head"><h4>Premier / Tratamiento de Sustrato</h4></div><div class="process-print-grid process-print-grid-ink"><label class="inline-process-check inline-field-check"><input data-scope="${scope}" data-field="requiresSubstrateTreatment" type="checkbox"${item.requiresSubstrateTreatment ? " checked" : ""}${treatmentDisabled}><span>Requiere Tratamiento de Sustrato</span></label><label><span>Modo Premier</span><select data-scope="${scope}" data-field="digitalPremierMode"${treatmentDisabled}><option value="offline"${String(item.digitalPremierMode) !== "inline" ? " selected" : ""}>Offline</option><option value="inline"${String(item.digitalPremierMode) === "inline" ? " selected" : ""}>In-line</option></select></label><label><span>Setup Premier</span>${displayInput(scope, "digitalPremierSetupMin", item.digitalPremierSetupMin, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Consumo Premier</span>${displayInput(scope, "digitalPremierConsumptionGm2", item.digitalPremierConsumptionGm2, { suffix: "g/m²", maximumFractionDigits: 4 })}</label><label><span>Costo kg Premier</span>${displayInput(scope, "digitalPremierCostPerKg", item.digitalPremierCostPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Costo m² Premier</span>${displayInput(scope, "digitalPremierCostPerM2", item.digitalPremierCostPerM2, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Costo Offline m</span>${displayInput(scope, "digitalPremierOfflineCostPerMeter", item.digitalPremierOfflineCostPerMeter, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Mantenimiento ILP</span>${displayInput(scope, "digitalPremierMaintenanceCost", item.digitalPremierMaintenanceCost, { prefix: "$", maximumFractionDigits: 6 })}</label></div></div>`;
  return `<details class="subprocess-card inline-process-card print-ink-card" data-open-key="${esc(scope)}.premier"><summary class="inline-process-summary"><div class="inline-process-heading"><strong>Premier</strong></div><div class="process-summary-side"><em>${pretreated ? "Pretratado" : money(printItem.premierSubtotal || 0)}</em>${infoPopoverButton("Premier", "Premier se aplica antes de imprimir. Si el sustrato ya viene pretratado, no se cobra líquido ni proceso. Offline agrega un paso adicional; in-line usa la misma prensa.", "formula-help")}</div></summary><div class="process-body">${premierZone}<div class="readonly-grid compact-top step-metrics">${metric("Tratamiento", item.requiresSubstrateTreatment ? "Sí" : "No")}${metric("Modo", String(item.digitalPremierMode || "offline") === "inline" ? "In-line" : "Offline")}${metric("Costo Premier", pretreated ? "Pretratado" : money(printItem.premierSubtotal || 0))}</div></div></details>`;
}

function renderDigitalInkBlock(scope, item, printItem) {
  const parameterZone = `<div class="process-zone"><div class="process-zone-head"><h4>Tintas Digitales</h4></div><div class="process-print-grid process-print-grid-ink"><label><span>Tipo Cobro</span><select data-scope="${scope}" data-field="digitalBillingType"><option value="consumo"${String(item.digitalBillingType) !== "clic" ? " selected" : ""}>Consumo</option><option value="clic"${String(item.digitalBillingType) === "clic" ? " selected" : ""}>Clic</option></select></label><label><span>Costo kg Tinta</span>${displayInput(scope, "digitalInkCostPerKg", item.digitalInkCostPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Costo kg Blanco</span>${displayInput(scope, "digitalWhiteInkCostPerKg", item.digitalWhiteInkCostPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Costo kg Especial</span>${displayInput(scope, "digitalSpecialInkCostPerKg", item.digitalSpecialInkCostPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Tarifa Clic</span>${displayInput(scope, "digitalClickRate", item.digitalClickRate, { prefix: "$", maximumFractionDigits: 6 })}</label><label><span>Modo Clic</span><select data-scope="${scope}" data-field="digitalClickMode"><option value="por_estacion"${String(item.digitalClickMode) !== "por_vuelta" ? " selected" : ""}>Por estación</option><option value="por_vuelta"${String(item.digitalClickMode) === "por_vuelta" ? " selected" : ""}>Por vuelta</option></select></label><label><span>Cobertura CMYK</span>${displayInput(scope, "digitalCmykCoveragePct", item.digitalCmykCoveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>Cobertura Blanco</span>${displayInput(scope, "digitalWhiteCoveragePct", item.digitalWhiteCoveragePct, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>Gramaje CMYK</span>${displayInput(scope, "digitalCmykGsm", item.digitalCmykGsm, { suffix: "g/m²", maximumFractionDigits: 4 })}</label><label><span>Gramaje Blanco</span>${displayInput(scope, "digitalWhiteGsm", item.digitalWhiteGsm, { suffix: "g/m²", maximumFractionDigits: 4 })}</label><label><span>Factor Merma</span>${displayInput(scope, "digitalWasteFactor", item.digitalWasteFactor, { maximumFractionDigits: 4 })}</label><label><span>Colores Especiales</span>${displayInput(scope, "digitalSpecialColors", item.digitalSpecialColors, { integer: true, maximumFractionDigits: 0 })}</label><label><span>Lavados Especiales</span>${displayInput(scope, "digitalSpecialWashCount", item.digitalSpecialWashCount, { integer: true, maximumFractionDigits: 0 })}</label><label><span>Costo Lavado</span>${displayInput(scope, "digitalSpecialWashCost", item.digitalSpecialWashCost, { prefix: "$", maximumFractionDigits: 4 })}</label></div></div>`;
  return `<details class="subprocess-card inline-process-card print-ink-card" data-open-key="${esc(scope)}.digital"><summary class="inline-process-summary"><div class="inline-process-heading"><strong>Tintas Digitales</strong></div><div class="process-summary-side"><em>${money((printItem.inkSubtotal || 0) + (printItem.digitalWashSubtotal || 0))}</em>${infoPopoverButton("Tintas Digitales", "El cálculo digital cambia según la máquina: consumo por kg o clic por estación o por vuelta. Blanco y colores especiales pueden tener un costo por kg distinto al CMYK.", "formula-help")}</div></summary><div class="process-body">${parameterZone}<div class="readonly-grid compact-top step-metrics">${metric("Estaciones", num(printItem.digitalStations || 0, 0))}${metric("Consumo Total", `${num(printItem.digitalInkKg || 0, 4)} kg`)}${metric("Consumo Blanco", `${num(printItem.digitalWhiteKg || 0, 4)} kg`)}${metric("Consumo Especial", `${num(printItem.digitalSpecialInkKg || 0, 4)} kg`)}${metric("Tinta / Clics", money(printItem.inkSubtotal || 0))}${metric("Lavados", money(printItem.digitalWashSubtotal || 0))}</div></div></details>`;
}

function renderPrintMaculaBlock(scope, printItem, isConventional) {
  if (!isConventional) return "";
  const info = "La sumatoria de merma suma la merma de montaje y la merma de impresión. El costo de material usa el sustrato seleccionado y los pies adicionales consumidos.";
  return `<details class="subprocess-card inline-process-card print-macula-card" data-open-key="${esc(scope)}.macula"><summary class="inline-process-summary"><div class="inline-process-heading"><strong>Merma de Procesos</strong></div><div class="process-summary-side"><em>${money(printItem.maculaMaterialSubtotal || 0)}</em>${infoPopoverButton("Merma de Procesos", info, "formula-help")}</div></summary><div class="process-body"><div class="editable-grid macula-cost-grid"><label><span>Merma Montaje</span>${displayInput(scope, "maculaSetupFeet", printItem.macula?.setupFeet || 0, { suffix: "pies", maximumFractionDigits: 2 })}</label><label><span>Merma Impresión</span>${displayInput(scope, "maculaTirajeFeet", printItem.macula?.tirajeFeet || 0, { suffix: "pies", maximumFractionDigits: 2 })}</label><label><span>Sumatoria</span>${readonlyDisplay(`${num(printItem.macula?.totalFeet || 0, 2)} pies`)}</label><label><span>% Merma Imp.</span>${displayInput(scope, "maculaTirajePct", printItem.macula?.tirajePct || 0, { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>Costo Merma</span>${readonlyDisplay(money(printItem.maculaMaterialSubtotal || 0))}</label></div></div></details>`;
}

function renderPrintStageCard(item, printItem, index, orderNumber) {
  const stageMachine = findMachine(item.machineId);
  const stagePrintOptions = printMachineOptions(item.machineId);
  const scope = `printStages.${index}`;
  const isConventionalMachine = !stageMachine || (!isDigitalProductionMachine(stageMachine) && machineProductionTypeLabel(stageMachine) !== "Digital");
  const allowedInlineKeys = new Set((printItem.availableInlineSlots || []).map((key) => String(key)));
  const visibleInlineItems = (printItem.inlineItems || []).filter((inline) => allowedInlineKeys.has(String(inline.key)));
  const inlineZone = machineAllowsAnyInline(stageMachine)
    ? subprocessCard(
      `${scope}.inline`,
      "Subprocesos Acabados Impresión",
      printItem.inlineSubtotal || 0,
      `<div class="subprocess-stack inline-print-stack">${visibleInlineItems.map((inline) => renderInlinePrintBlock(item, index, inline)).join("")}</div>`,
      "inline-zone-shell inline-zone-group",
      false
    )
    : `<div class="inline-toggle-note">Esta máquina no tiene subprocesos inline habilitados para cotización.</div>`;
  const speedDisplayValue = n(item.speedMetersMin, 0);
  const speedUnit = printSpeedUnit(stageMachine);
  const configZone = `<div class="process-zone"><div class="process-zone-head"><h4>Parámetros de Configuración</h4></div><div class="process-machine-row"><label class="span-2"><span>Máquina</span><select data-scope="${scope}" data-field="machineId">${processOptions(stagePrintOptions, item.machineId)}</select></label></div><div class="process-subsection"><h5>Producción</h5><div class="process-print-grid process-print-grid-production"><label><span>Setup <span class="field-unit">min</span></span>${displayInput(scope, "setupMinutes", item.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Limpieza <span class="field-unit">min</span></span>${displayInput(scope, "cleaningMinutes", item.cleaningMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Montaje <span class="field-unit">min</span></span>${displayInput(scope, "mountingMinutes", item.mountingMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label><label><span>Merma Arranque <span class="field-unit">ft</span></span>${displayInput(scope, "maculaSetupFeet", item.maculaSetupFeet, { suffix: "ft", maximumFractionDigits: 2 })}</label><label><span>% Merma Tiraje</span>${displayInput(scope, "maculaTirajePct", firstPositiveNumber(printItem.macula?.tirajePct, item.maculaTirajePct), { suffix: "%", maximumFractionDigits: 2 })}</label><label><span>Velocidad <span class="field-unit">${speedUnit}</span></span>${displayInput(scope, "speedMetersMin", item.speedMetersMin, { suffix: speedUnit, maximumFractionDigits: 2, inputValue: speedDisplayValue, displayValue: speedDisplayValue })}</label><label><span>Estaciones</span>${displayInput(scope, "availableColors", item.availableColors, { integer: true, maximumFractionDigits: 0, step: "1" })}</label><label><span>Costo Máquina <span class="field-unit">$/h</span></span>${displayInput(scope, "costHour", item.costHour, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Costo Operador <span class="field-unit">$/h</span></span>${displayInput(scope, "operatorHourCost", item.operatorHourCost, { prefix: "$", maximumFractionDigits: 2 })}</label></div></div></div>`;
  const costInfo = isConventionalMachine ? "Tiempo total = setup + limpieza + montaje + proceso lineal. Consumo tinta = área impresa x cobertura x BCM anilox x factor transferencia x densidad tinta x tintas requeridas." : "Tiempo total = setup + limpieza + montaje + proceso lineal. En digital, la tinta se cobra por consumo kg o por clic según la máquina; Premier se suma si el sustrato requiere tratamiento.";
  const metricsZone = `<div class="process-zone process-zone-accent"><div class="process-zone-head"><h4>Indicadores del Proceso</h4></div><div class="process-kpi-grid">${metricBox("Pies Netos", printItem.linealFeet > 0 ? `${num(printItem.linealFeet || 0, 2)} pies` : "Pendiente", n(printItem.linealFeet, 0) <= 0)}${metricBox("Merma Total", printItem.startupWasteFeet > 0 ? `${num(printItem.startupWasteFeet || 0, 2)} pies` : "Pendiente", (printItem.issues || []).some((issue) => String(issue).toLowerCase().includes("merma")))}${metricBox("Longitud Total", printItem.totalLengthFeet > 0 ? `${num(printItem.totalLengthFeet || 0, 2)} pies` : "Pendiente", (printItem.issues || []).length > 0)}${metricBox("Tiempo Total", printItem.totalMinutes > 0 ? `${num(printItem.totalMinutes || 0, 2)} min` : "Pendiente", (printItem.issues || []).some((issue) => issue.includes("Velocidad") || issue.includes("Montaje y Ajuste")))}</div>${issueList("Problemas detectados en la fórmula", printItem.issues || [])}</div>`;
  const maculaZone = renderPrintMaculaBlock(scope, printItem, isConventionalMachine);
  const premierZone = !isConventionalMachine ? renderDigitalPremierBlock(scope, item, printItem) : "";
  const inkZone = isConventionalMachine ? renderPrintInkBlock(scope, item, printItem) : renderDigitalInkBlock(scope, item, printItem);
  const costZone = `<div class="process-zone process-zone-accent">
        <div class="process-zone-head"><h4>1. Configuración de Tintas</h4></div>
        <div class="summary-rows process-cost-summary">
            <div class="config-tintas-grid">
                <span>CMYK: ${printItem.cmykCount || 4} tintas</span>
                <span>Blanco: ${printItem.whiteActive ? 'Sí' : 'No'}</span>
                <span>Pantones: ${printItem.pantoneCount || 0}</span>
                <span>Especiales: ${printItem.specialCount || 0}</span>
            </div>
        </div>
        
        <div class="process-zone-head"><h4>2. Merma de Procesos</h4></div>
        <div class="summary-rows process-cost-summary">
            ${summaryRowWithInfo("Merma Montaje", `${num(printItem.macula?.setupFeet || 0, 2)} pies`, "Merma de montaje del proceso.")}
            ${summaryRowWithInfo("Merma Impresión", `${num(printItem.macula?.tirajeFeet || 0, 2)} pies`, "Merma de impresión calculada para el tiraje.")}
            ${summaryRowWithInfo("Sumatoria", `${num(printItem.macula?.totalFeet || printItem.startupWasteFeet || 0, 2)} pies`, "Suma de merma de montaje y merma de impresión.")}
            ${isConventionalMachine ? summaryRowWithInfo("Costo Merma", money(printItem.maculaMaterialSubtotal || 0), "Costo de material adicional generado por merma. Se muestra aquí para lectura operativa y forma parte del consumo de sustrato.") : ""}
            ${summaryRowWithInfo("Importe Merma", money(printItem.maculaTotalFeetCost || 0), "Merma = pies × $/pie. Se incluye en el consumo total de material.")}
        </div>
        
        <div class="process-zone-head"><h4>3. Costos por Tipo de Tinta</h4></div>
        <div class="summary-rows process-cost-summary">
            ${summaryRowWithInfo("Costo Máquina", money(printItem.machineSubtotal || 0), "Costo Máquina", costInfo)}
            ${summaryRowWithInfo("Costo Operador", money(printItem.operatorSubtotal || 0), "Costo Operador", costInfo)}
            ${summaryRowWithInfo("Costo Tinta", money(printItem.inkSubtotal || 0), "Costo Tinta = MSI consumida × $/MSI × Tintas requeridas", costInfo)}
            ${!isConventionalMachine ? summaryRowWithInfo("Premier", money(printItem.premierSubtotal || 0), "Premier", "Tratamiento de sustrato: líquido, setup y proceso offline o mantenimiento in-line.") : ""}
            ${!isConventionalMachine ? summaryRowWithInfo("Lavados Especiales", money(printItem.digitalWashSubtotal || 0), "Lavados Especiales", "Costo por lavados de tintas especiales o gamut extendido.") : ""}
        </div>
        
        <div class="process-zone-head"><h4>4. Cálculo Final</h4></div>
        <div class="summary-rows process-cost-summary">
            ${summaryRowWithInfo("Subprocesos En Línea", money(printItem.inlineSubtotal || 0), "Subprocesos En Línea", "Subtotal de acabados activados dentro de la misma línea de impresión.")}
            <div class="summary-row process-row-total"><span>Subtotal Impresión</span><strong>${money(printItem.subtotal || 0)}</strong></div>
        </div>
    </div>`;
  const speedLengthUnit = speedUnit === "m/min" ? "metros" : "pies";
  const lowerBlocks = [premierZone, inkZone, maculaZone, `<div class="inline-print-zone">${inlineZone}</div>`].filter(Boolean).join("");
  const body = `<div class="process-layout process-layout-print"><div class="process-layout-main">${configZone}</div><div class="process-layout-side">${metricsZone}${costZone}</div></div><div class="print-stage-expanded-blocks">${lowerBlocks}</div>${formula("Fórmula de Tiempo Total", `Tiempo Total en Máquina (min) = (Longitud Total en ${speedLengthUnit} / Velocidad de Operación en ${speedUnit}) + Tiempo de Montaje y Ajuste`, "La longitud total de impresión suma la merma y luego se divide entre la velocidad real de operación. Después se agrega el tiempo de preparación, limpieza y montaje.", {
    exampleLines: [
      `Tiempo Total: (${formulaValue(printItem.totalLengthFeet || printItem.totalLengthMeters || 0, 2)} / ${formulaValue(item.speedMetersMin, 2)}) + ${formulaValue(printItem.setupAdjustmentMin || 0, 2)} = ${formulaValue(printItem.totalMinutes || 0, 2)} min`,
      `Subtotal Impresión: ${formulaValue(printItem.machineSubtotal || 0, 2)} + ${formulaValue(printItem.operatorSubtotal || 0, 2)} + ${formulaValue(printItem.inkSubtotal || 0, 2)} + ${formulaValue(printItem.inlineSubtotal || 0, 2)} = ${formulaValue(printItem.rawSubtotal ?? printItem.subtotal ?? 0, 2)}`,
      ...minimumCostExampleLines(printItem, "Impresión")
    ],
    answer: `R/ El total a cobrar de impresión es ${money(printItem.subtotal || 0)}`
  })}`;
  return card(`impresion-${item.id || index + 1}`, `${orderNumber}. Impresión`, item.machineName || "Máquina de impresión", printItem.subtotal || 0, body, { removable: true, removeType: "print-stage", removeIndex: index });
}

function renderExternalFinishCard(config, finish, index, orderNumber) {
  const materialOptions = materialsByClassification(config.materialFamily, config.materialKeywords || []).map((item) => ({ id: item.id, nombre: item.descripcion || item.nombre || item.id }));
  const machineOptions = finishMachineOptions(config, finish.machineId);
  const scope = `finishes.${index}`;
  const speedSuffix = "ft/min";
  const displayTotalMinutes = r(n(finish.setupMinutes, 0) + n(finish.runMinutes, 0), 6);
  const processMachineCost = r((displayTotalMinutes / 60) * n(first(finish.costHourMachine, finish.costHour), 0), 4);
  const processOperatorCost = r((displayTotalMinutes / 60) * n(finish.costHourOperator, 0), 4);
  const linearCost = r((n(finish.calcBase, 0) * n(finish.variableUnitCost, 0)) || 0, 4);
  const showBaseCost = config.key === "troquelado" && n(finish.fixedCost, 0) > 0;
  const showLinearCost = config.key === "troquelado";
  const machineFields = [
    `<label class="span-2"><span>Máquina</span><select data-scope="${scope}" data-field="machineId">${processOptions(machineOptions, finish.machineId)}</select></label>`,
    `<label><span>Montaje <span class="field-unit">min</span></span>${displayInput(scope, "setupMinutes", finish.setupMinutes, { suffix: "min", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Velocidad <span class="field-unit">ft/min</span></span>${displayInput(scope, "speed", finish.speed, { suffix: speedSuffix, maximumFractionDigits: 4 })}</label>`,
    `<label><span>Costo Máquina <span class="field-unit">$/h</span></span>${displayInput(scope, "costHourMachine", finish.costHourMachine, { prefix: "$", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Costo Operador <span class="field-unit">$/h</span></span>${displayInput(scope, "costHourOperator", finish.costHourOperator, { prefix: "$", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Merma Ajuste <span class="field-unit">ft</span></span>${displayInput(scope, "setupWasteFeet", finish.setupWasteFeet, { suffix: "ft", maximumFractionDigits: 2 })}</label>`,
    `<label><span>Merma Operación <span class="field-unit">%</span></span>${displayInput(scope, "operationWastePct", finish.operationWastePct, { suffix: "%", maximumFractionDigits: 2 })}</label>`
  ];
  const plateFields = [];
  const materialFields = [];
  if (config.usesWeightMaterial) {
    materialFields.push(
      `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, finish.materialId)}</select></label>`,
      `<label><span>Rendimiento <span class="field-unit">g/ft²</span></span>${displayInput(scope, "layerGft2", finish.layerGft2, { maximumFractionDigits: 6 })}</label>`,
      `<label><span>Costo Kg <span class="field-unit">$/kg</span></span>${displayInput(scope, "costPerKg", finish.costPerKg, { prefix: "$", maximumFractionDigits: 6 })}</label>`
    );
  } else if (config.usesUnitMaterial) {
    materialFields.push(
      `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, finish.materialId)}</select></label>`,
      `<label><span>Costo Unidad <span class="field-unit">$</span></span>${displayInput(scope, "costPerUnit", finish.costPerUnit, { prefix: "$", maximumFractionDigits: 6 })}</label>`
    );
  } else if (config.usesMaterial) {
    materialFields.push(
      `<label class="span-2"><span>Material</span><select data-scope="${scope}" data-field="materialId">${processOptions(materialOptions, finish.materialId)}</select></label>`,
      `<label><span>Costo ft² <span class="field-unit">$/ft²</span></span>${displayInput(scope, "costPerFt2", finish.costPerFt2, { prefix: "$", maximumFractionDigits: 6 })}</label>`
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
      `<label><span>Ancho Cliché <span class="field-unit">in</span></span>${displayInput(scope, "plateWidthIn", finish.plateWidthIn, { suffix: "in", maximumFractionDigits: 4 })}</label>`,
      `<label><span>Largo Cliché <span class="field-unit">in</span></span>${displayInput(scope, "plateLengthIn", finish.plateLengthIn, { suffix: "in", maximumFractionDigits: 4 })}</label>`
    );
    plateFields.push(`<label><span>Costo Cliché <span class="field-unit">$</span></span>${displayInput(scope, "plateCost", finish.plateCost, { prefix: "$", maximumFractionDigits: 2 })}</label>`);
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
  const finishExampleParts = [
    formulaValue(processMachineCost, 2),
    formulaValue(processOperatorCost, 2),
    formulaValue(finish.fixedCost || 0, 2),
    formulaValue(linearCost || 0, 2),
    formulaValue(finish.materialSubtotal || 0, 2),
    config.usesPlateCost ? formulaValue(finish.plateCost || 0, 2) : ""
  ].filter(Boolean).join(" + ");
  const body = `<div class="process-layout process-layout-print"><div class="process-layout-main">${configZone}</div><div class="process-layout-side">${indicatorZone}${costZone}</div></div>${formula(`Cálculo ${config.label}`, finish.formulaText || "", finish.explanation || "El subtotal combina preparación, corrida e insumos propios del acabado.", {
    exampleLines: [
      `Subtotal ${config.label}: ${finishExampleParts} = ${formulaValue(finish.rawSubtotal ?? finish.subtotal ?? 0, 2)}`,
      ...minimumCostExampleLines(finish, config.label)
    ],
    answer: `R/ El total a cobrar por ${config.label.toLowerCase()} es ${money(finish.subtotal || 0)}`
  })}`;
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
  const visibleProfiles = profiles
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !norm(row?.tipo).includes("barniz"));
  if (!visibleProfiles.length) return `<div class="macula-empty">Sin perfiles cargados en Costos.</div>`;
  return `<div class="ink-profile-table"><div class="ink-profile-head ink-profile-row"><span>Tipo de Trabajo</span><span>BCM</span><span>Cobertura %</span><span>GSM</span></div>${visibleProfiles.map(({ row, index }) => `<div class="ink-profile-row"><input data-scope="${scope}.inkProfiles.${index}" data-field="tipo" type="text" value="${esc(row.tipo || "")}"><input data-scope="${scope}.inkProfiles.${index}" data-field="bcm" type="number" step="0.01" value="${esc(row.bcm)}"><input data-scope="${scope}.inkProfiles.${index}" data-field="coveragePct" type="number" step="0.01" value="${esc(row.coveragePct)}"><input data-scope="${scope}.inkProfiles.${index}" data-field="gsm" type="number" step="0.01" value="${esc(row.gsm)}"></div>`).join("")}</div>`;
}

function renderProcesses() {
  closeInfoPopover();
  const focusSnapshot = captureFocus();
  snapshotOpenProcesses();
  syncDerivedHeaderAndPackaging(state.form);
  syncSubstratePricingWithMaterial(state.form);
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
  const sectionBuilders = {
    macula: () => card("macula", nextTitle("Merma"), "", macula.subtotal, `<div class="process-zone"><div class="process-zone-head"><h4>Merma Montaje</h4></div>${renderMaculaMontajeRows(state.form.macula?.montajeRows || [])}</div><div class="process-zone"><div class="process-zone-head"><h4>Merma Tiraje</h4></div>${renderMaculaTirajeRows(state.form.macula?.tirajeRows || [])}</div>${formula("Base de merma", macula.formulaText, macula.explanation, {
      exampleLines: [
        `Merma Montaje actual: ${formulaValue(macula.montajeTotalPies || 0, 2)} pies`,
        `Merma Tiraje promedio: ${formulaValue(macula.tirajePromedioPct || 0, 2)} %`,
        ...minimumCostExampleLines(macula, "Merma")
      ],
      answer: `R/ La referencia actual de merma usa ${formulaValue(macula.montajeRows.length, 0)} filas de montaje y ${formulaValue(macula.tirajeRows.length, 0)} filas de tiraje`
    })}`),
    troquel: () => { const shapeValue = String(state.form.troquel.dieShape || state.context?.calculo?.raw_data?.["REQ | Forma"] || '').trim(); const shapeIndex = { Circular: 1, Cuadrado: 2, Rectangular: 3, Ovalado: 4, Especial: 5 }[shapeValue] || 0; const shapeImage = shapeIndex ? state.config?.general?.['dieShapeImage' + shapeIndex] || '' : ''; const recommendedDie = recommendedDieForCurrentForm(); const recommendedLabel = recommendedDie ? `Recomendado: ${first(recommendedDie.codigoTroquel, recommendedDie.codigo, recommendedDie.id)}` : "Seleccionar..."; const productDimension = `${num(state.form.header?.labelWidthIn || 0, 3)} x ${num(state.form.header?.labelHeightIn || 0, 3)} in`; return card("troquel", nextTitle("Troquel"), state.form.troquel.dieDescription, troquel.subtotal, `<div class="editable-grid"><label class="span-2"><span>Troquel</span><select data-scope="troquel" data-field="dieCode">${processOptions(dieOptions, state.form.troquel.dieCode, recommendedLabel)}</select></label></div><div class="readonly-grid compact-top">${shapeImage ? `<div class="metric-cell" style="grid-column:1/-1;display:flex;align-items:center;gap:10px"><span>Forma</span><strong>${esc(shapeValue || "No definida")}</strong><img src="${esc(shapeImage)}" alt="${esc(shapeValue)}" style="height:36px;width:auto;border-radius:4px;border:1px solid var(--color-border-tertiary);"></div>` : metric("Forma", esc(shapeValue || "No definida"))}${metric("Dimensión Producto", productDimension)}${metric("Código Troquel", esc(state.form.troquel.dieCode || "No definido"))}${metric("Ancho Montaje", `${num(state.form.troquel.widthIn, 3)} in`)}${metric("Largo Montaje", `${num(state.form.troquel.lengthIn, 3)} in`)}${metric("Ancho Material", `${num(state.form.troquel.materialWidthIn || 0, 3)} in`)}${metric("Elongación", `${num(state.form.troquel.elongationPct || 0, 3)} %`)}${metric("Dientes", num(state.form.troquel.teeth, 0))}${metric("Repeticiones", num(state.form.troquel.repeats, 0))}${metric("Filas", num(state.form.troquel.rows, 0))}${metric("Etiquetas por Vuelta", num(troquel.labelsPerRepeat, 0))}${metric("Desarrollo Total", `${num(troquel.development, 3)} in`)}</div>${formula("Base del Troquel", troquel.formulaText, troquel.explanation, {
      exampleLines: [
        `Etiquetas por repetición: ${formulaValue(state.form.troquel.rows || 0, 0)} x ${formulaValue(state.form.troquel.repeats || 0, 0)} = ${formulaValue(troquel.labelsPerRepeat || 0, 0)}`,
        `Desarrollo total: ${formulaValue(state.form.troquel.lengthIn || 0, 2)} x ${formulaValue(state.form.troquel.repeats || 0, 0)} = ${formulaValue(troquel.development || 0, 2)} in`,
        ...minimumCostExampleLines(troquel, "Troquel")
      ],
      answer: `R/ El troquel actual entrega ${formulaValue(troquel.labelsPerRepeat || 0, 0)} etiquetas por vuelta y ${formulaValue(troquel.development || 0, 2)} in de desarrollo`
    })}`); },
    sustrato: () => card("sustrato", nextTitle("Sustrato"), sustrato.materialName || "Selecciona material", sustrato.subtotal, `<div class="editable-grid substrate-grid"><label class="span-2"><span>Material</span><select data-scope="substrate" data-field="materialId">${processOptions(substrateMaterialOptions().map((item) => ({ id: item.id, nombre: item.nombre || item.name || item.descripcion || item.id })), state.form.substrate.materialId)}</select></label><label><span>Costo/pie</span>${displayInput("substrate", "costPerFoot", state.form.substrate.costPerFoot, { prefix: "$", suffix: "/pie", maximumFractionDigits: 6, step: "0.000001" })}</label></div><div class="readonly-grid compact-top">${metricBox("Etiquetas al Través", sustrato.acrossCount > 0 ? num(sustrato.acrossCount, 0) : "Pendiente", n(sustrato.acrossCount, 0) <= 0)}${metricBox("Desarrollo del Cilindro", sustrato.cylinderDevelopmentIn > 0 ? `${num(sustrato.cylinderDevelopmentIn, 3)} in` : "Pendiente", n(sustrato.cylinderDevelopmentIn, 0) <= 0)}${metricBox("Merma Total", sustrato.startupWasteFeet > 0 ? `${num(sustrato.startupWasteFeet, 2)} pies` : "Pendiente", (sustrato.issues || []).some((issue) => String(issue).toLowerCase().includes("merma")))}${metricBox("Longitud Total", sustrato.totalLengthFeet > 0 ? `${num(sustrato.totalLengthFeet, 2)} pies` : "Pendiente", (sustrato.issues || []).length > 0)}${metricBox("Área Total Consumida", sustrato.totalAreaFt2 > 0 ? `${num(sustrato.totalAreaFt2, 2)} ft²` : "Pendiente", n(sustrato.webWidthIn, 0) <= 0 || (sustrato.issues || []).length > 0)}${metric("Costo por Pie", money(sustrato.unitCost))}${metric("Subtotal", money(sustrato.subtotal))}</div>${issueList("Problemas detectados en la fórmula", sustrato.issues || [])}${formula("Costo del Sustrato", sustrato.formulaCost, sustrato.explanation, {
      exampleLines: [
        `Cantidad Lineal Sustrato: ( ${formulaValue(sustrato.qty || 0, 0)} x ${formulaValue(sustrato.cylinderDevelopmentIn || 0, 2)} ) / ( 12 x ${formulaValue(sustrato.acrossCount || 0, 0)} ) = ${formulaValue(sustrato.linealFeet || 0, 2)}`,
        `Longitud Total: ${formulaValue(sustrato.linealFeet || 0, 2)} + ${formulaValue(sustrato.startupWasteFeet || 0, 2)} = ${formulaValue(sustrato.totalLengthFeet || 0, 2)}`,
        `Costo de Sustrato: ( ${formulaValue(sustrato.linealFeet || 0, 2)} + ${formulaValue(sustrato.startupWasteFeet || 0, 2)} ) x ${formulaValue(sustrato.unitCost || 0, 4)} = ${formulaValue(sustrato.rawSubtotal ?? sustrato.subtotal ?? 0, 2)}`,
        ...minimumCostExampleLines(sustrato, "Sustrato")
      ],
      answer: `R/ El total a cobrar del consumo de sustrato es ${money(sustrato.subtotal || 0)}`
    })}`),
    diseno: () => card("diseno", nextTitle("Diseño"), "", design.subtotal, `<div class="editable-grid design-cost-grid"><label><span>Artes</span>${displayInput("design", "artCount", state.form.design.artCount, { integer: true, step: "1" })}</label><label><span>Tiempo <span class="field-unit">h</span></span>${displayInput("design", "timePerArt", state.form.design.timePerArt, { suffix: "h", maximumFractionDigits: 2 })}</label><label><span>Cambios</span>${displayInput("design", "changeFactor", state.form.design.changeFactor, { maximumFractionDigits: 2 })}</label><label><span>Costo/h <span class="field-unit">$/h</span></span>${displayInput("design", "hourCost", state.form.design.hourCost, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Tiempo Total</span>${readonlyDisplay(`${num(design.time, 2)} h`)}</label><label><span>Subtotal</span>${readonlyDisplay(money(design.subtotal))}</label></div>${formula("Cálculo de Diseño", design.formulaText, design.explanation, {
      exampleLines: [
        `Tiempo total: (${formulaValue(state.form.header.quantityTypes || state.form.design.artCount || 0, 0)} x ${formulaValue(state.form.design.timePerArt || 0, 2)}) + (${formulaValue(state.form.header.quantityChanges || 0, 0)} x ${formulaValue(state.form.design.timePerArt || 0, 2)} x ${formulaValue(state.form.design.changeFactor || 0, 2)}) = ${formulaValue(design.time || 0, 2)} h`,
        `Costo Diseño: ${formulaValue(design.time || 0, 2)} x ${formulaValue(state.form.design.hourCost || 0, 2)} = ${formulaValue(design.rawSubtotal ?? design.subtotal ?? 0, 2)}`,
        ...minimumCostExampleLines(design, "Diseño")
      ],
      answer: `R/ El total a cobrar por diseño es ${money(design.subtotal || 0)}`
    })}`),
    preprensa: () => card("preprensa", nextTitle("Preprensa"), "", prepress.subtotal, `<div class="editable-grid design-cost-grid"><label><span>Artes</span>${displayInput("prepress", "artCount", state.form.prepress.artCount, { integer: true, step: "1" })}</label><label><span>Artes/h <span class="field-unit">art/h</span></span>${displayInput("prepress", "artsPerHour", state.form.prepress.artsPerHour, { suffix: "art/h", maximumFractionDigits: 2 })}</label><label><span>Costo/h <span class="field-unit">$/h</span></span>${displayInput("prepress", "hourCost", state.form.prepress.hourCost, { prefix: "$", maximumFractionDigits: 2 })}</label><label><span>Tiempo Total</span>${readonlyDisplay(`${num(prepress.time, 2)} h`)}</label><label><span>Subtotal</span>${readonlyDisplay(money(prepress.subtotal))}</label></div>${formula("Cálculo de Preprensa", prepress.formulaText, prepress.explanation, {
      exampleLines: [
        `Tiempo Preprensa: ${formulaValue(Math.max(1, state.form.header.quantityTypes || state.form.prepress.artCount || 0), 0)} / ${formulaValue(state.form.prepress.artsPerHour || 0, 2)} = ${formulaValue(prepress.time || 0, 2)} h`,
        `Costo Preprensa: ${formulaValue(prepress.time || 0, 2)} x ${formulaValue(state.form.prepress.hourCost || 0, 2)} = ${formulaValue(prepress.rawSubtotal ?? prepress.subtotal ?? 0, 2)}`,
        ...minimumCostExampleLines(prepress, "Preprensa")
      ],
      answer: `R/ El total a cobrar por preprensa es ${money(prepress.subtotal || 0)}`
    })}`),
    planchas: () => {
      const plateMode = normalizePlateMode(state.form.plates?.plateMode);
      const selector = renderPlateModeSelector();
      const body = plateMode === "external"
        ? `${selector}${renderPlateExternalPanel(plates)}`
        : (plateMode === "create"
          ? `${selector}${renderPlateCreatePanel(plates)}`
        : (plateMode === "inventory"
          ? `${selector}${renderPlateInventoryPanel(plates)}`
          : `${selector}${renderPlatePendingPanel()}${formula("Planchas", "Selecciona planchas en inventario o costo externo.", plates.explanation, {
            exampleLines: ["Pendiente definir inventario o costo externo."],
            answer: "R/ Falta definir inventario o costo externo de planchas."
          })}`));
      return card("planchas", `${nextTitle("Planchas")}${digitalProcessNote ? ` <span style="color:#c62828;font-size:12px;font-weight:400;">${esc(digitalProcessNote)}</span>` : ""}`, "", plateMode === "inventory" ? null : plates.subtotal, body);
    },
    empaque: () => card("empaque", nextTitle("Empaque"), "", packaging.subtotal, `<div class="editable-grid"><label><span>Rollos</span>${readonlyDisplay(`${num(state.form.packaging.rollCount || 0, 2)} rollos`)}</label><label><span>Rend./h</span>${displayInput("packaging", "yieldPerHour", state.form.packaging.yieldPerHour, { suffix: "rollos/h", maximumFractionDigits: 2, step: "0.01" })}</label><label><span>Operarios</span>${displayInput("packaging", "operators", state.form.packaging.operators, { integer: true, maximumFractionDigits: 0, step: "1" })}</label><label><span>Costo Op.</span>${displayInput("packaging", "hourCost", state.form.packaging.hourCost, { prefix: "$", maximumFractionDigits: 2, step: "0.01" })}</label><label><span>Costo Ext.</span>${displayInput("packaging", "externalCost", state.form.packaging.externalCost, { prefix: "$", maximumFractionDigits: 2, step: "0.01" })}</label><label class="span-2"><span>Comentarios</span><input data-scope="packaging" data-field="comments" type="text" value="${esc(state.form.packaging.comments)}"></label><label class="span-2 file-icon-field"><span>Adjunto <span class="field-unit-clip" aria-hidden="true">&#128206;</span></span><input data-scope="packaging" data-field="attachmentName" data-kind="file" type="file"></label></div><div class="readonly-grid compact-top">${metric("Tiempo", `${num(packaging.hours, 2)} h`)}${metric("Subtotal", money(packaging.subtotal))}</div>${formula("Cálculo de Empaque", packaging.formulaText, packaging.explanation, {
      exampleLines: [
        `Cantidad de Rollos: ${formulaValue(currentQuantity(state.form), 0)} / ${formulaValue(state.form.header.labelsPerRoll || 0, 0)} = ${formulaValue(packaging.rolls || 0, 4)}`,
        `Tiempo Empaque: ${formulaValue(packaging.rolls || 0, 2)} / ${formulaValue(state.form.packaging.yieldPerHour || 0, 2)} = ${formulaValue(packaging.hours || 0, 2)} h`,
        `Costo Empaque: (${formulaValue(packaging.hours || 0, 2)} x ${formulaValue(state.form.packaging.operators || 0, 0)} x ${formulaValue(state.form.packaging.hourCost || 0, 2)}) + ${formulaValue(state.form.packaging.externalCost || 0, 2)} = ${formulaValue(packaging.rawSubtotal ?? packaging.subtotal ?? 0, 2)}`,
        ...minimumCostExampleLines(packaging, "Empaque")
      ],
      answer: `R/ El total a cobrar por empaque es ${money(packaging.subtotal || 0)}`
    })}`),
    adicionales: () => card("adicionales", nextTitle("Procesos Adicionales"), "", additional.subtotal, `<div class="table-toolbar"><button type="button" class="inline-button" data-action="add-additional">Agregar fila</button></div><div class="additional-table"><div class="additional-head"><span>Descripción</span><span>Costo</span><span>Comentarios</span><span></span></div>${(state.form.additional.length ? state.form.additional : [{ description: "", cost: 0, attachmentName: "", comments: "" }]).map((item, index) => renderAdditionalProcessRow(item, index)).join("")}</div>${formula("Subtotal Adicional", "Subtotal procesos adicionales = suma de costos manuales registrados.", "Este bloque absorbe costos o gestiones que todavía no están estandarizados en inventario.", {
      exampleLines: [
        `Subtotal Adicionales: ${(additional.rows || []).length ? additional.rows.map((row) => formulaValue(row.subtotal || 0, 2)).join(" + ") : "0"} = ${formulaValue(additional.rawSubtotal ?? additional.subtotal ?? 0, 2)}`,
        ...minimumCostExampleLines(additional, "Procesos adicionales")
      ],
      answer: `R/ El total a cobrar por procesos adicionales es ${money(additional.subtotal || 0)}`
    })}`)
  };
  const finishEntries = finishes.items.map((calc) => ({
    index: Number.isInteger(calc.sourceIndex) ? calc.sourceIndex : (state.form.finishes || []).indexOf(calc),
    finish: calc,
    config: EXTERNAL_FINISH_BY_KEY[calc.processKey],
    calc
  })).filter((entry) => entry.config && entry.calc);
  const orderedKeys = sortActiveProcessKeys(state.form.activeProcessKeys || []).filter((key) => isProcessAllowedForCurrentFrontBackContext(key));
  orderedKeys.forEach((key) => {
    if (key === "impresion") {
      activePrintStages().forEach((item, index) => pushSection(renderPrintStageCard(item, print.items[index] || {}, index, orderNumber++)));
      return;
    }
    if (EXTERNAL_FINISH_BY_KEY[key]) {
      finishEntries.filter((entry) => entry.finish.processKey === key).forEach((entry) => {
        pushSection(renderExternalFinishCard(entry.config, entry.calc, entry.index, orderNumber++));
      });
      return;
    }
    const builder = sectionBuilders[key];
    if (builder) pushSection(builder());
  });

  els.processSections.innerHTML = sections.join("");

  injectProcessRemoveButtons();
  updateProcessSurface();
  restoreOpenProcesses();
  renderSidebar(result);
  refreshCalculationValidation(result);
  normalizeVisibleFieldLabels(els.processSections);
  restoreFocus(focusSnapshot);
  publishBdfgContext();
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

function getNestedTarget(scope) {
  const parts = String(scope || "").split(".");
  let target = state.form;
  while (parts.length && target) {
    const key = /^\d+$/.test(parts[0]) ? Number(parts[0]) : parts[0];
    target = target[key];
    parts.shift();
  }
  return target || null;
}

function syncNumberingAttachmentState(scope, attachments = []) {
  const target = getNestedTarget(scope);
  if (!target) return;
  target.attachments = attachments.filter((attachment) => String(attachment?.fileName || "").trim());
  target.attachmentName = target.attachments[0]?.fileName || "";
  if (scope.startsWith("printStages.")) syncPrimaryPrintStage();
}

function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("No fue posible leer el adjunto."));
    reader.readAsDataURL(file);
  });
}

async function uploadNumberingAttachment(file) {
  const quoteCode = String(state.form?.header?.quoteCode || "").trim();
  const lineCode = String(state.form?.header?.lineCode || "").trim();
  if (!quoteCode || !lineCode || !file) return null;
  const contentBase64 = await readFileBase64(file);
  const payload = await postJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileExt: (file.name.split(".").pop() || "").trim(),
    contentBase64,
    notes: "Numerado"
  });
  return payload?.adjunto || null;
}

function applyDieDefaults(dieCode) {
  const die = findDie(dieCode);
  if (!die) return;
  const metricsValue = resolveDieMetrics(die, state.context?.calculo || {});
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
    const machine = findMachine(finish?.machineId);
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
    availableColors: machineSupportsInline(machine) ? 8 : 4,
    maculaSetupFeet: defaultPrintMaculaSetupFeet(machineId)
  });
  if (Array.isArray(state.form.printStages) && state.form.printStages.length) {
    Object.assign(state.form.printStages[0], state.form.print);
    syncInlineFinishesForMachine(0);
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
  const digitalSettings = digitalMachineSettings(machine, state.form.printStages[index]);
  const isDigital = isDigitalProductionMachine(machine);
  const stations = Math.max(0, effectiveColors(state.form) + n(state.form.printStages[index].digitalSpecialColors, 0));
  Object.assign(state.form.printStages[index], {
    machineId,
    machineName: machineDisplayName(machine) || state.form.printStages[index].machineName,
    setupMinutes: firstPositiveNumber(machine.setupBaseMinutes, capacity?.tiempo_preparacion_general, state.form.printStages[index].setupMinutes),
    mountingMinutes: firstPositiveNumber(machine.setupPerStationMinutes, capacity?.tiempo_por_estacion, 0) * Math.max(1, effectiveColors(state.form)),
    speedMetersMin: isDigital ? digitalSpeedForStations(machine, state.form.printStages[index], stations) : (printSpeedValue(firstPositiveNumber(machine.productionSpeed, capacity?.velocidad_produccion, 0)) || state.form.printStages[index].speedMetersMin),
    costHour: firstPositiveNumber(machine.hourlyMachineCost, capacity?.costo_hora_maquina, state.form.printStages[index].costHour),
    operatorHourCost: firstPositiveNumber(machine.hourlyOperatorCost, capacity?.costo_hora_operario, state.form.printStages[index].operatorHourCost),
    availableColors: machineSupportsInline(machine) ? 8 : 4,
    digitalBillingType: digitalSettings.billingType,
    digitalInkCostPerKg: digitalSettings.inkCostPerKg,
    digitalWhiteInkCostPerKg: digitalSettings.whiteInkCostPerKg,
    digitalSpecialInkCostPerKg: digitalSettings.specialInkCostPerKg,
    digitalClickRate: digitalSettings.clickRate,
    digitalClickMode: digitalSettings.clickMode,
    digitalCmykGsm: digitalSettings.cmykGsm,
    digitalWhiteGsm: digitalSettings.whiteGsm,
    digitalWasteFactor: digitalSettings.wasteFactor,
    digitalSpecialWashCost: digitalSettings.specialWashCost,
    digitalPremierMode: digitalSettings.premierMode,
    digitalPremierSetupMin: digitalSettings.premierSetupMin,
    digitalPremierOfflineCostPerMeter: digitalSettings.premierOfflineCostPerMeter,
    digitalPremierMaintenanceCost: digitalSettings.premierMaintenanceCost,
    maculaSetupFeet: defaultPrintMaculaSetupFeet(machineId)
  });
  syncInlineFinishesForMachine(index);
  if (index === 0) syncPrimaryPrintStage();
}

function commitDetailsCommercialValue(key, value) {
  state.form.commercial[key] = n(value, 0);
  if (els[key]) els[key].value = state.form.commercial[key];
  scheduleSave();
  renderProcesses();
}

function openDetailsCommercialEditor(button) {
  const key = button?.dataset?.detailsEdit;
  if (!key || !Object.prototype.hasOwnProperty.call(state.form.commercial, key)) return;
  const rowNode = button.closest(".details-cost-row");
  const targetCell = rowNode?.querySelector(".details-cost-value.is-edit-target");
  if (!targetCell) return;
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "0.01";
  if (key === "discountPct") input.max = "100";
  input.className = "details-adjust-input";
  input.value = state.form.commercial[key] ?? 0;
  targetCell.innerHTML = "";
  targetCell.appendChild(input);
  input.focus();
  input.select();
  const commit = () => commitDetailsCommercialValue(key, input.value);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") renderProcesses();
  });
  input.addEventListener("blur", commit, { once: true });
}

function bindDetailsDemo() {
  els.detailsProformaButton?.addEventListener("click", (event) => {
    event.preventDefault();
    const done = setTrackingButtonLoading(els.detailsProformaButton, "Validando...");
    openProformaForCurrentQuote().catch(() => {
      showCenterMessage("No fue posible validar la proforma en este momento.");
    }).finally(done);
  });
  els.detailsCostTable?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-details-edit]");
    if (!trigger) return;
    event.preventDefault();
    openDetailsCommercialEditor(trigger);
  });
  els.quoteTrackingMount?.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-tracking-toggle]");
    if (toggle) {
      state.quoteTracking.panelOpen = !state.quoteTracking.panelOpen;
      renderQuoteTracking();
      return;
    }
    const proforma = event.target.closest("[data-tracking-proforma]");
    if (proforma) {
      event.preventDefault();
      const done = setTrackingButtonLoading(proforma, "Validando...");
      openProformaForCurrentQuote().catch(() => showCenterMessage("No fue posible validar la proforma en este momento.")).finally(done);
      return;
    }
    const complete = event.target.closest("[data-tracking-complete]");
    if (complete) {
      const index = Number(complete.dataset.trackingComplete);
      const item = state.quoteTracking.milestones?.[index];
      const done = setTrackingButtonLoading(complete, item?.key === "envio" ? "Enviando..." : "Guardando...");
      completeQuoteTrackingMilestone(index).catch((error) => {
        showCenterMessage(error.message || "No fue posible actualizar el seguimiento.");
      }).finally(done);
      return;
    }
    const createOrder = event.target.closest("[data-tracking-create-order]");
    if (createOrder) {
      const done = setTrackingButtonLoading(createOrder, "Creando...");
      createProductionOrderFromTracking(Number(createOrder.dataset.trackingCreateOrder)).catch((error) => {
        showCenterMessage(error.message || "No fue posible crear la orden.");
      }).finally(done);
      return;
    }
    const closeReason = event.target.closest("[data-tracking-open-close-reason]");
    if (closeReason) {
      openQuoteClosureForm(Number(closeReason.dataset.trackingOpenCloseReason));
      return;
    }
    const closeSubmit = event.target.closest("[data-tracking-submit-close]");
    if (closeSubmit) {
      const done = setTrackingButtonLoading(closeSubmit, "Guardando...");
      submitQuoteClosureReason(Number(closeSubmit.dataset.trackingSubmitClose)).catch((error) => {
        showCenterMessage(error.message || "No fue posible guardar el cierre.");
      }).finally(done);
      return;
    }
    const createProduct = event.target.closest("[data-tracking-create-product]");
    if (createProduct) {
      const done = setTrackingButtonLoading(createProduct, "Creando...");
      createProductFromCurrentLine().catch((error) => {
        showCenterMessage(error.message || "No fue posible crear el producto.");
      }).finally(done);
      return;
    }
    const undo = event.target.closest("[data-tracking-undo]");
    if (undo) {
      undoQuoteTrackingMilestone(Number(undo.dataset.trackingUndo));
      return;
    }
    const openForm = event.target.closest("[data-tracking-open-form]");
    if (openForm) {
      openQuoteTrackingForm(Number(openForm.dataset.trackingOpenForm));
      return;
    }
    if (event.target.closest("[data-tracking-close-form]")) {
      closeQuoteTrackingForm();
      return;
    }
    const submit = event.target.closest("[data-tracking-submit-cr]");
    if (submit) {
      const done = setTrackingButtonLoading(submit, "Enviando...");
      submitQuoteTrackingChange(Number(submit.dataset.trackingSubmitCr)).catch(() => {
        showCenterMessage("No fue posible enviar la solicitud de cambios.");
      }).finally(done);
    }
  });
  els.quoteTrackingMount?.addEventListener("input", (event) => {
    if (event.target.matches("[data-tracking-textarea]")) event.target.classList.remove("error");
    if (event.target.matches("[data-tracking-close-input]")) event.target.classList.remove("error");
  });
}

function bindHeader() {
  els.frontBackElementsBody?.addEventListener("click", async (event) => {
    const tab = event.target.closest("[data-front-back-element-tab]");
    if (tab) {
      const nextCode = tab.dataset.frontBackElementTab || "";
      const currentCode = state.frontBackActiveElementLineCode || "";
      if (currentCode) await persistFrontBackEmbeddedFrame(currentCode);
      state.frontBackActiveElementLineCode = currentCode === nextCode ? "" : nextCode;
      renderFrontBackElementsCard();
      renderProcesses();
      return;
    }
    const openButton = event.target.closest("[data-front-back-open-line]");
    if (openButton) {
      const lineCode = openButton.dataset.frontBackOpenLine || "";
      const related = [state.context?.calculo, ...(state.context?.lineasRelacionadas || [])].filter(Boolean);
      const target = related.find((line) => String(line.lineCode || line.line_code || line.linea || "").trim() === lineCode);
      const route = storedLineRoute(target || { line_code: lineCode, quote_code: state.form?.header?.quoteCode });
      if (route && !openRouteInShell(route, `Cálculo ${lineCode}`)) window.location.href = route;
    }
  });
  [["customerCode", els.customerCode, "text"], ["customerName", els.customerName, "text"], ["productType", els.productType, "text"], ["jobName", els.jobName, "text"], ["salespersonName", els.salespersonName, "text"], ["workType", els.workType, "text"], ["labelWidthIn", els.labelWidthIn, "number"], ["labelHeightIn", els.labelHeightIn, "number"], ["rollWidthIn", els.rollWidthIn, "number"], ["coreDiameter", els.coreDiameter, "text"], ["labelsPerRoll", els.labelsPerRoll, "number"], ["applicationType", els.applicationType, "text"], ["applicationEnvironment", els.applicationEnvironment, "text"], ["surfaceType", els.surfaceType, "text"], ["outputType", els.outputType, "text"], ["quantityTypes", els.quantityTypes, "number"], ["quantityChanges", els.quantityChanges, "number"], ["pantoneCount", els.pantoneCount, "number"]].forEach(([key, element, type]) => {
    const updateState = () => {
      state.form.header[key] = type === "number" ? n(element.value, 0) : element.value;
      syncDerivedHeaderAndPackaging(state.form);
      if (key === "customerCode") syncCustomerCodeWidth();
      if (key === "outputType") outputPreview();
      if (key === "customerName" && els.customerNameDisplay) els.customerNameDisplay.textContent = state.form.header.customerName || "";
      if (key === "salespersonName" && els.salespersonDisplay) els.salespersonDisplay.textContent = state.form.header.salespersonName || "";
      if (key === "labelWidthIn" || key === "labelHeightIn" || key === "rollWidthIn" || key === "coreDiameter" || key === "labelsPerRoll") syncHeaderUnitMasks();
      refreshCalculationValidation();
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
  els.sapPreviewSendButton?.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      els.sapPreviewSendButton.disabled = true;
      await sendSapPreview();
    } catch (error) {
      els.calcStatus.textContent = error.message || "No fue posible preparar la salida SAP.";
    } finally {
      els.sapPreviewSendButton.disabled = false;
    }
  });
  els.sapPreviewOpenOutputButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    openSapOutputView();
  });
  els.viewProformaButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    openProformaForCurrentQuote().catch(() => {
      showCenterMessage("No fue posible validar la proforma en este momento.");
    });
  });
  [["overheadPct", els.overheadPct], ["marginPct", els.marginPct], ["taxPct", els.taxPct], ["discountPct", els.discountPct]].forEach(([key, element]) => {
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
    if (isFrontBackElementContext()) {
      input.value = formatInteger(currentQuantity(state.form));
      return;
    }
    const index = Number(input.dataset.quantityIndex);
    state.form.header.quantities[index].value = Math.max(0, n(input.value, 0));
    input.value = state.form.header.quantities[index].value ? formatInteger(state.form.header.quantities[index].value) : "";
    syncDerivedHeaderAndPackaging(state.form);
    refreshCalculationValidation();
    scheduleSave();
  });
  els.quantityRepeater.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-quantity-index]");
    if (!input) return;
    if (isFrontBackElementContext()) {
      input.value = formatInteger(currentQuantity(state.form));
      return;
    }
    const index = Number(input.dataset.quantityIndex);
    state.form.header.quantities[index].value = Math.max(0, n(input.value, 0));
    input.value = state.form.header.quantities[index].value ? formatInteger(state.form.header.quantities[index].value) : "";
    syncDerivedHeaderAndPackaging(state.form);
    renderProcesses();
    scheduleSave();
  });
  els.quantityRepeater.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (isFrontBackElementContext()) return;
    if (button.dataset.action === "add-quantity") {
      if (state.form.header.quantities.length >= getQuantityCapacity()) return;
      const index = Number(button.dataset.index);
      const insertAt = Number.isInteger(index) ? index + 1 : state.form.header.quantities.length;
      state.form.header.quantities.splice(insertAt, 0, { id: `qty-${Date.now()}`, value: 0 });
      state.form.header.quantities = normalizeQuantities(state.form.header.quantities);
      syncDerivedHeaderAndPackaging(state.form);
      renderHeader();
      renderProcesses();
      els.quantityRepeater.querySelector(`input[data-quantity-index="${Math.min(insertAt, state.form.header.quantities.length - 1)}"]`)?.focus();
      scheduleSave();
      return;
    }
    if (button.dataset.action === "remove-quantity") {
      if (state.form.header.quantities.length <= 1) return;
      const index = Number(button.dataset.index);
      const removeAt = Number.isInteger(index) ? index : state.form.header.quantities.length - 1;
      state.form.header.quantities.splice(Math.max(0, Math.min(removeAt, state.form.header.quantities.length - 1)), 1);
      state.form.header.quantities = normalizeQuantities(state.form.header.quantities);
      syncDerivedHeaderAndPackaging(state.form);
      renderHeader();
      renderProcesses();
      els.quantityRepeater.querySelector(`input[data-quantity-index="${Math.max(0, Math.min(removeAt, state.form.header.quantities.length - 1))}"]`)?.focus();
      scheduleSave();
    }
  });
}

function bindProcesses() {
  els.processSections.addEventListener("toggle", (event) => {
    const details = event.target.closest("details.process-card, details.subprocess-card[data-open-key]");
    if (!details) return;
    const key = details.dataset.openKey || details.dataset.processKey || details.querySelector("summary strong")?.textContent?.trim();
    if (key) state.processOpen[key] = details.open;
  }, true);

  const update = (event, shouldRender = false) => {
    const target = event.target;
    const scope = target.dataset.scope;
    const field = target.dataset.field;
    if (!scope || !field) return;
    if (scope.startsWith("additional.") && !state.form.additional[Number(scope.split(".")[1])]) state.form.additional[Number(scope.split(".")[1])] = { description: "", cost: 0, attachmentName: "", comments: "" };
    if (scope.startsWith("plates.external.")) {
      state.form.plates.external = normalizePlateExternalRows(state.form.plates.external);
      const index = Number(scope.split(".")[2]);
      if (Number.isInteger(index) && !state.form.plates.external[index]) state.form.plates.external[index] = { description: "", cost: 0, attachmentName: "", comments: "" };
    }
    if (target.dataset.kind === "file" && field === "numberingAttachment") {
      const file = target.files?.[0] || null;
      if (!file) return;
      const targetItem = getNestedTarget(scope);
      const attachments = normalizeNumberingAttachments(targetItem);
      const index = Math.max(0, Number(target.dataset.numberingAttachmentIndex) || 0);
      attachments[index] = { id: "", fileName: file.name, notes: "Numerado" };
      syncNumberingAttachmentState(scope, attachments);
      renderProcesses();
      scheduleSave();
      uploadNumberingAttachment(file)
        .then((stored) => {
          if (!stored?.id) return;
          const currentItem = getNestedTarget(scope);
          const currentAttachments = normalizeNumberingAttachments(currentItem);
          const matchIndex = currentAttachments.findIndex((attachment, itemIndex) => itemIndex === index || attachment.fileName === file.name);
          if (matchIndex < 0) return;
          currentAttachments[matchIndex] = {
            id: String(stored.id || ""),
            fileName: String(stored.file_name || stored.fileName || file.name),
            notes: "Numerado"
          };
          syncNumberingAttachmentState(scope, currentAttachments);
          scheduleSave();
        })
        .catch((error) => {
          els.calcStatus.textContent = error.message || "No fue posible guardar el adjunto general.";
        });
      return;
    }
    let value = target.dataset.kind === "file" ? (target.files?.[0]?.name || "") : target.type === "checkbox" ? target.checked : target.type === "number" ? n(target.value, 0) : target.value;
    if (target.tagName === "SELECT" && field === "isQr") value = String(target.value).toLowerCase() === "true";
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
    if (scope.startsWith("printStages.") && scope.includes(".inlineFinishes.numerado") && field === "numberingType") {
      const parts = scope.split(".");
      const stageIndex = Number(parts[1]);
      if (state.form.printStages?.[stageIndex]?.inlineFinishes?.numerado) {
        const normalizedType = normalizeNumberingType(value);
        state.form.printStages[stageIndex].inlineFinishes.numerado.numberingType = normalizedType;
        state.form.printStages[stageIndex].inlineFinishes.numerado.isQr = /qr/i.test(normalizedType);
        if (!isConsecutiveNumbering(normalizedType)) {
          state.form.printStages[stageIndex].inlineFinishes.numerado.rangeFrom = "";
          state.form.printStages[stageIndex].inlineFinishes.numerado.rangeTo = "";
        }
      }
    }
    if (scope === "substrate" && field === "materialId") {
      const material = findMaterial(value);
      const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
      state.form.substrate.costPerFoot = costs.costPerFoot;
      state.form.substrate.costPerMeter = costs.costPerMeter;
      state.form.substrate.costPerMsi = r(costs.costMsi, 6);
      const materialNeedsPremier = materialRequiresPremier(material);
      const materialPreTreated = materialPremierPreapplied(material);
      const premierDefaults = digitalInkDefaults();
      activePrintStages().forEach((stage) => {
        stage.requiresSubstrateTreatment = materialNeedsPremier && !materialPreTreated;
        stage.digitalPremierConsumptionGm2 = firstPositiveNumber(material?.premierConsumptionGm2, material?.premier_consumo_g_m2, stage.digitalPremierConsumptionGm2, premierDefaults.premierConsumptionGm2);
        stage.digitalPremierCostPerKg = firstPositiveNumber(material?.premierCostPerKgUsd, material?.premier_costo_x_kg, stage.digitalPremierCostPerKg, premierDefaults.premierCostPerKg);
        stage.digitalPremierCostPerM2 = firstPositiveNumber(material?.premierCostPerM2Usd, material?.premier_costo_x_m2, stage.digitalPremierCostPerM2, premierDefaults.premierCostPerM2);
      });
    }
    if (scope.startsWith("printStages.") && field === "inkMaterialId") {
      const stageIndex = Number(scope.split(".")[1]);
      const material = findMaterial(value);
      state.form.printStages[stageIndex].inkCostPerLb = materialCostPerPound(material);
      state.form.printStages[stageIndex].inkMaterialDesc = material ? (material.descripcion || material.nombre || '') : '';
      syncPrimaryPrintStage();
    }
    if (scope.startsWith("printStages.") && field === "whiteInkMaterialId") {
      const stageIndex = Number(scope.split(".")[1]);
      const material = findMaterial(value);
      state.form.printStages[stageIndex].whiteInkCostPerLb = materialCostPerPound(material);
      state.form.printStages[stageIndex].whiteInkMaterialDesc = material ? (material.descripcion || material.nombre || '') : '';
      syncPrimaryPrintStage();
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
          costPerKg: n(material?.costo_x_kg, 0),
          layerGft2: n(first(material?.rendimiento_g_ft2, material?.peso_capa_gsm), 0)
        });
      } else {
        const costs = materialUnitCosts(material, state.form.header.rollWidthIn);
        Object.assign(state.form.printStages[stageIndex].inlineFinishes[inlineKey], {
          costPerFoot: costs.costPerFoot,
          costPerMeter: costs.costPerMeter,
          costPerMsi: costs.costMsi,
          costPerFt2: n(first(material?.costo_x_ft2, material?.costoPorFt2), 0),
          costPerUnit: n(material?.costo_x_unidad, 0),
          costPerKg: n(material?.costo_x_kg, 0),
          layerGft2: n(first(material?.rendimiento_g_ft2, material?.peso_capa_gsm), 0)
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
      else refreshCalculationValidation();
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
      renderProcessPicker();
      renderProcesses();
      scheduleSave();
      return;
    }
    if (button.dataset.action === "clear-numbering-attachment") {
      const scope = button.dataset.scope;
      if (scope) {
        const target = getNestedTarget(scope);
        const attachments = normalizeNumberingAttachments(target);
        const index = Number(button.dataset.index);
        const removed = Number.isInteger(index) ? attachments.splice(index, 1)[0] : attachments.shift();
        syncNumberingAttachmentState(scope, attachments);
        if (removed?.id) {
          fetch(`/api/adjuntos/${encodeURIComponent(removed.id)}`, { method: "DELETE" }).catch(() => null);
        }
        renderProcesses();
        scheduleSave();
      }
      return;
    }
    if (button.dataset.action === "clear-additional-attachment") {
      const index = Number(button.dataset.index);
      if (Number.isInteger(index) && state.form.additional?.[index]) {
        state.form.additional[index].attachmentName = "";
        renderProcesses();
        scheduleSave();
      }
      return;
    }
    if (button.dataset.action === "set-plate-mode") {
      state.form.plates.plateMode = normalizePlateMode(button.dataset.plateMode);
      state.form.plates.external = normalizePlateExternalRows(state.form.plates.external);
      state.form.plates.inventory = state.form.plates.inventory && typeof state.form.plates.inventory === "object" ? state.form.plates.inventory : { materialId: "" };
      renderProcesses();
      scheduleSave();
      return;
    }
    if (button.dataset.action === "clear-plate-external-attachment") {
      const index = Number(button.dataset.index);
      if (Number.isInteger(index) && state.form.plates?.external?.[index]) {
        state.form.plates.external[index].attachmentName = "";
        renderProcesses();
        scheduleSave();
      }
      return;
    }
    if (button.dataset.action === "add-plate-external") {
      state.form.plates.external = normalizePlateExternalRows(state.form.plates.external);
      state.form.plates.external.push({ description: "", cost: 0, attachmentName: "", comments: "" });
    }
    if (button.dataset.action === "remove-plate-external") {
      state.form.plates.external = normalizePlateExternalRows(state.form.plates.external);
      state.form.plates.external.splice(Number(button.dataset.index), 1);
      state.form.plates.external = normalizePlateExternalRows(state.form.plates.external);
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
      renderProcessPicker();
      renderProcesses();
      scheduleSave();
    }
  });
}

function bindProcessLauncher() {
  if (!els.processLauncherButton || !els.processLauncherBridge || !els.processLauncherMenu) return;
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
      renderProcessPicker();
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

function bindProcessPicker() {
  if (!els.processPickerButton || !els.processPickerPanel || !els.processPickerMenu) return;

  els.processPickerButton.addEventListener("click", () => {
    state.processPickerOpen = !state.processPickerOpen;
    renderProcessPicker();
  });

  els.processPickerMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-process-key]");
    if (!button || button.disabled) return;
    const processKey = button.dataset.processKey || "";
    if (!processKey) return;
    if (addProcessKey(processKey)) {
      state.processPickerOpen = false;
      renderProcessPicker();
      renderProcessLauncher();
      renderProcesses();
      scheduleSave();
    }
  });

  els.processPickerMenu.addEventListener("dragstart", (event) => {
    const button = event.target.closest("button[data-process-key]");
    if (!button || button.disabled || !event.dataTransfer) return;
    state.draggingProcessKey = button.dataset.processKey || "";
    event.dataTransfer.setData("text/process-key", state.draggingProcessKey);
    event.dataTransfer.effectAllowed = "copy";
    els.processSections.classList.add("is-drop-target");
  });

  els.processPickerMenu.addEventListener("dragend", () => {
    state.draggingProcessKey = "";
    els.processSections.classList.remove("is-drop-target");
  });

  document.addEventListener("click", (event) => {
    if (!state.processPickerOpen) return;
    if (event.target.closest(".process-picker")) return;
    state.processPickerOpen = false;
    renderProcessPicker();
  });
}

function isBdfgProcessMessageForCurrentLine(data = {}) {
  const targetLineCode = String(data.lineCode || data.targetLineCode || "").trim();
  if (!targetLineCode) return true;
  return targetLineCode === String(state.form?.header?.lineCode || "").trim();
}

function bindBdfgProcessTray() {
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (!isBdfgProcessMessageForCurrentLine(data)) return;
    if (data.type === "erp-process-drag-start") {
      state.draggingProcessKey = String(data.processId || "").trim();
      els.processSections?.classList.add("is-drop-target");
      return;
    }
    if (data.type === "erp-process-drag-end") {
      state.draggingProcessKey = "";
      els.processSections?.classList.remove("is-drop-target");
      return;
    }
    if (data.type === "erp-process-tap-add") {
      const processKey = String(data.processId || "").trim();
      if (!processKey) return;
      if (addProcessKey(processKey)) {
        renderProcessLauncher();
        renderProcessPicker();
        renderProcesses();
        scheduleSave();
      }
    }
  });
}

async function init() {
  try {
    const quoteId = params.get("quoteId") || "";
    const lineId = params.get("lineId") || "";
    const [config, catalogs, context, costsConfig, sapConfig, sapSalespersonConfigs, sapProductionCostCenter, trackingUsers] = await Promise.all([
      withTimeout(getJson("/api/config/shell"), 1500, {}),
      withTimeout(getJson("/api/catalogs"), 2500, emptyCatalogs()),
      quoteId || lineId ? getJson(`/api/flexo/calculo?${new URLSearchParams({ quoteId, lineId }).toString()}`) : Promise.resolve(null),
      getJson("/api/costos-config").catch(() => null),
      getJson("/api/sap/config").catch(() => null),
      getJson("/api/sap/salesperson-profit-centers").catch(() => ({ items: [] })),
      getJson("/api/sap/production-cost-center").catch(() => null),
      getJson("/api/admin-users", { headers: sessionHeaders() }).catch(() => [])
    ]);
    state.config = config;
    state.context = context;
    state.costsConfig = costsConfig;
    state.sapConfig = sapConfig;
    state.sapSalespersonConfigs = Array.isArray(sapSalespersonConfigs?.items) ? sapSalespersonConfigs.items : [];
    state.sapProductionCostCenter = sapProductionCostCenter;
    state.trackingUserPhotos = buildTrackingUserPhotoMap(trackingUsers);
    state.catalogs = {
      materials: catalogs.materials || [],
      troqueles: catalogs.troqueles || [],
      machines: catalogs.machines || [],
      machineCategories: catalogs.machineCategories || {},
      processes: buildLocalProcessCatalog(catalogs.processes || []),
      outputTypes: catalogs.outputTypes || []
    };
    state.form = buildForm();
    await loadLineNotifications();
    els.pageTitle.textContent = "Cálculo de Flexografía";
    renderHeader();
    renderProcessLauncher();
    renderProcessPicker();
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
    bindDetailsDemo();
    bindFavoriteDocument();
    bindTimelineLauncher();
    bindQuantityRepeater();
    bindProcesses();
    bindProcessPicker();
    bindProcessLauncher();
    bindBdfgProcessTray();
    const jumpProcess = String(params.get("jumpProcess") || "").trim();
    if (jumpProcess) setTimeout(() => jumpToProcessIssue(jumpProcess), 350);
    window.addEventListener("resize", () => {
      renderQuantities();
      updateProcessLauncherMenuPlacement();
    });
  } catch (error) {
    els.calcStatus.textContent = error.message || "No fue posible cargar el cálculo.";
  }
}

document.addEventListener("toggle", (event) => {
  if (event.target && event.target.matches && event.target.matches("details.process-card, details.subprocess-card[data-open-key]")) {
    return;
  }
}, true);

document.addEventListener("click", (event) => {
  const closeMessage = event.target.closest?.("[data-close-calc-message]");
  if (closeMessage) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById("calcCenterMessage")?.setAttribute("hidden", "");
    return;
  }
  const processJump = event.target.closest?.("[data-jump-process]");
  if (processJump) {
    event.preventDefault();
    event.stopPropagation();
    jumpToProcessIssue(processJump.dataset.jumpProcess);
    return;
  }
  const closeSubmit = event.target.closest?.("[data-tracking-submit-close]");
  if (closeSubmit && document.getElementById("calcCenterMessage")?.contains(closeSubmit)) {
    event.preventDefault();
    event.stopPropagation();
    const done = setTrackingButtonLoading(closeSubmit, "Guardando...");
    submitQuoteClosureReason(Number(closeSubmit.dataset.trackingSubmitClose))
      .then((saved) => {
        if (saved) document.getElementById("calcCenterMessage")?.setAttribute("hidden", "");
      })
      .catch((error) => showCenterMessage(error.message || "No fue posible guardar el cierre."))
      .finally(done);
    return;
  }
  const routeLink = event.target.closest?.("[data-route]");
  if (routeLink) {
    event.preventDefault();
    event.stopPropagation();
    openAppRoute(routeLink.dataset.route, routeLink.dataset.label || routeLink.textContent || "Documento");
    return;
  }
  const trigger = event.target.closest?.(".info-popover-trigger");
  const panel = state.infoPopover.panel;
  if (trigger) {
    event.preventDefault();
    event.stopPropagation();
    openInfoPopover(trigger);
    return;
  }
  if (panel && !panel.hidden && !panel.contains(event.target)) {
    closeInfoPopover();
  }
}, true);

document.addEventListener("click", (event) => {
  const toggle = event.target.closest?.("[data-details-toggle]");
  if (!toggle || !els.detailsCostTable?.contains(toggle)) return;
  event.preventDefault();
  event.stopPropagation();
  const key = toggle.dataset.detailsToggle;
  state.detailsOpen[key] = !state.detailsOpen[key];
  renderDetailsDemo(totals());
}, true);

document.addEventListener("pointerover", (event) => {
  const trigger = event.target.closest?.(".details-cost-value.has-tooltip");
  if (!trigger || !els.detailsCostTable?.contains(trigger)) return;
  showInfoPopover(trigger);
});

document.addEventListener("pointerout", (event) => {
  const trigger = event.target.closest?.(".details-cost-value.has-tooltip");
  if (!trigger || !els.detailsCostTable?.contains(trigger)) return;
  if (event.relatedTarget && trigger.contains(event.relatedTarget)) return;
  if (state.infoPopover.trigger === trigger) closeInfoPopover();
});

document.addEventListener("focusin", (event) => {
  const trigger = event.target.closest?.(".details-cost-value.has-tooltip");
  if (!trigger || !els.detailsCostTable?.contains(trigger)) return;
  showInfoPopover(trigger);
});

document.addEventListener("focusout", (event) => {
  const trigger = event.target.closest?.(".details-cost-value.has-tooltip");
  if (!trigger || !els.detailsCostTable?.contains(trigger)) return;
  if (event.relatedTarget && trigger.contains(event.relatedTarget)) return;
  if (state.infoPopover.trigger === trigger) closeInfoPopover();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeInfoPopover();
  }
});

window.addEventListener("resize", () => {
  if (state.infoPopover.trigger) positionInfoPopover();
});

window.addEventListener("scroll", () => {
  if (state.infoPopover.trigger) positionInfoPopover();
}, true);

init();
