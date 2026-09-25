// ============================================================================
// Launcher global de Trazabilidad — un único punto para abrir el mapa de
// trazabilidad desde cualquier módulo del ERP.
//
// Uso:
//   openTrazabilidad({ entityType: 'product', entityId: 'PT-00184' });
//   openTrazabilidad({ entityType: 'order', entityId: 'OP-00458' });
//   openTrazabilidad({ entityType: 'quote', entityId: 'C-000019' });
//
// Como la aplicación es multi-página (sin router de cliente), abrir la
// trazabilidad significa navegar a /trazabilidad?entityType=...&entityId=...
// En una pestaña nueva por defecto, para no perder el contexto de la página
// de origen.
// ============================================================================
window.openTrazabilidad = function (options) {
    const entityType = options && options.entityType;
    const entityId = options && options.entityId;
    if (!entityType || !entityId) {
        console.warn('openTrazabilidad requiere { entityType, entityId }');
        return;
    }
    const url = `/trazabilidad?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`;
    window.open(url, '_blank');
};
