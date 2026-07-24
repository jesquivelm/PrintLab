/**
 * Migración: Poblar resumen_creacion con métricas en órdenes y productos existentes
 *
 * Uso: node scripts/migrate-resumen.js
 *
 * Busca datos desde múltiples fuentes:
 *   1. line_snapshot.raw_data.Datos_Cotizados.metricas (en la orden misma)
 *   2. flexo_calculations (cálculo origen) -> Datos_Cotizados.metricas
 *   3. Datos planos en line_snapshot (materialFeet, materialMsi, materialM2)
 */
const { query } = require('../db/postgres');

async function findSourceMetrics(quoteCode, lineCode) {
    if (!quoteCode || !lineCode) return null;
    try {
        const r = await query(
            "SELECT raw_data->'Datos_Cotizados'->'metricas' AS metricas FROM flexo_calculations WHERE quote_code = $1 AND line_code = $2 AND raw_data->'Datos_Cotizados'->'metricas' IS NOT NULL ORDER BY created_at DESC LIMIT 1",
            [quoteCode, lineCode]
        );
        if (r.rows.length && r.rows[0].metricas) return r.rows[0].metricas;
    } catch (_) {}
    return null;
}

function buildMetricsFromSnapshot(ls) {
    if (!ls || typeof ls !== 'object') return null;
    const feet = parseFloat(ls.materialFeet) || 0;
    const msi = parseFloat(ls.materialMsi) || 0;
    const m2 = parseFloat(ls.materialM2) || 0;
    const areaM2 = parseFloat(ls.areaM2) || 0;
    const qty = parseInt(ls.quantityProducts) || 0;
    if (!feet && !msi && !m2 && !areaM2) return null;
    return {
        pies_lineales: feet,
        pies_lineales_con_merma: feet,
        msi_base: msi,
        msi_con_merma: msi,
        area_m2: m2 || areaM2,
        pasos_por_linea: null,
        filas: null,
        largo_total_pulgadas: parseFloat(ls.lengthInches) || null,
        peso_kg: null,
        minutos_tiraje: null,
        tintas_efectivas: null
    };
}

async function migrateOrders() {
    console.log('=== Migrando órdenes...');
    const orders = await query("SELECT order_code, quote_code, line_code, raw_data FROM flexo_orders ORDER BY created_at");
    let updated = 0, skipped = 0, errors = 0;

    for (const row of orders.rows) {
        const raw = row.raw_data || {};
        const existing = raw.resumen_creacion;

        if (existing && existing.metricas && existing.metricas.pies_lineales_con_merma !== undefined && existing.metricas.pies_lineales_con_merma !== null) {
            skipped++;
            continue;
        }

        const ls = raw.line_snapshot || {};
        const lr = ls.raw_data || raw;
        const dc = lr['Datos_Cotizados'] || {};
        const calcMet = dc.metricas || {};

        var metricas = null;
        var hasCalcMetrics = calcMet.piesLineales !== undefined || calcMet.piesLinealesConMerma !== undefined;

        if (hasCalcMetrics) {
            metricas = {
                pasos_por_linea: calcMet.pasosPorLinea ?? null,
                filas: calcMet.filas ?? null,
                largo_total_pulgadas: calcMet.largoTotalPulgadas ?? null,
                pies_lineales: calcMet.piesLineales ?? null,
                pies_lineales_con_merma: calcMet.piesLinealesConMerma ?? null,
                msi_base: calcMet.msiBase ?? null,
                msi_con_merma: calcMet.msiConMerma ?? null,
                area_m2: calcMet.areaM2 ?? null,
                peso_kg: calcMet.pesoKg ?? null,
                minutos_tiraje: calcMet.minutosTiraje ?? null,
                tintas_efectivas: calcMet.tintasEfectivas ?? null
            };
        } else {
            const srcMetrics = await findSourceMetrics(row.quote_code, row.line_code);
            if (srcMetrics) {
                metricas = {
                    pasos_por_linea: srcMetrics.pasosPorLinea ?? null,
                    filas: srcMetrics.filas ?? null,
                    largo_total_pulgadas: srcMetrics.largoTotalPulgadas ?? null,
                    pies_lineales: srcMetrics.piesLineales ?? null,
                    pies_lineales_con_merma: srcMetrics.piesLinealesConMerma ?? null,
                    msi_base: srcMetrics.msiBase ?? null,
                    msi_con_merma: srcMetrics.msiConMerma ?? null,
                    area_m2: srcMetrics.areaM2 ?? null,
                    peso_kg: srcMetrics.pesoKg ?? null,
                    minutos_tiraje: srcMetrics.minutosTiraje ?? null,
                    tintas_efectivas: srcMetrics.tintasEfectivas ?? null
                };
            } else {
                metricas = buildMetricsFromSnapshot(ls);
            }
        }

        if (!metricas) {
            skipped++;
            continue;
        }

        try {
            const hasAny = Object.values(metricas).some(v => v !== null && v !== undefined);
            if (!hasAny) { skipped++; continue; }

            const summary = existing || {};
            summary.metricas = metricas;

            await query(
                "UPDATE flexo_orders SET raw_data = raw_data || jsonb_build_object('resumen_creacion', $2::jsonb) WHERE order_code = $1",
                [row.order_code, JSON.stringify(summary)]
            );
            updated++;
            console.log('  OK', row.order_code, '| metricas:', Object.values(metricas).filter(v => v !== null).length, 'campos');
        } catch (e) {
            errors++;
            console.log('  ERR', row.order_code, e.message);
        }
    }
    console.log('  Resultado: actualizadas=' + updated + ' saltadas=' + skipped + ' errores=' + errors);
    return { updated, skipped, errors };
}

async function migrateProducts() {
    console.log('\n=== Migrando productos...');
    const products = await query("SELECT product_code, raw_data FROM flexo_products WHERE raw_data IS NOT NULL ORDER BY created_at");
    let updated = 0, skipped = 0, errors = 0;

    for (const row of products.rows) {
        const raw = row.raw_data || {};
        const existing = raw.resumen_creacion;

        if (existing && existing.metricas && existing.metricas.pies_lineales_con_merma !== undefined) {
            skipped++;
            continue;
        }

        const dc = raw['Datos_Cotizados'] || {};
        const calcMet = dc.metricas || {};
        var metricas = null;
        var hasCalcMetrics = calcMet.piesLineales !== undefined || calcMet.piesLinealesConMerma !== undefined;

        if (hasCalcMetrics) {
            metricas = {
                pasos_por_linea: calcMet.pasosPorLinea ?? null,
                filas: calcMet.filas ?? null,
                largo_total_pulgadas: calcMet.largoTotalPulgadas ?? null,
                pies_lineales: calcMet.piesLineales ?? null,
                pies_lineales_con_merma: calcMet.piesLinealesConMerma ?? null,
                msi_base: calcMet.msiBase ?? null,
                msi_con_merma: calcMet.msiConMerma ?? null,
                area_m2: calcMet.areaM2 ?? null,
                peso_kg: calcMet.pesoKg ?? null,
                minutos_tiraje: calcMet.minutosTiraje ?? null,
                tintas_efectivas: calcMet.tintasEfectivas ?? null
            };
        } else {
            const srcMetrics = await findSourceMetrics(raw['ID COTIZACION'] || row.quote_code, raw['ID LINEA'] || row.line_code);
            if (srcMetrics) {
                metricas = {
                    pasos_por_linea: srcMetrics.pasosPorLinea ?? null,
                    filas: srcMetrics.filas ?? null,
                    largo_total_pulgadas: srcMetrics.largoTotalPulgadas ?? null,
                    pies_lineales: srcMetrics.piesLineales ?? null,
                    pies_lineales_con_merma: srcMetrics.piesLinealesConMerma ?? null,
                    msi_base: srcMetrics.msiBase ?? null,
                    msi_con_merma: srcMetrics.msiConMerma ?? null,
                    area_m2: srcMetrics.areaM2 ?? null,
                    peso_kg: srcMetrics.pesoKg ?? null,
                    minutos_tiraje: srcMetrics.minutosTiraje ?? null,
                    tintas_efectivas: srcMetrics.tintasEfectivas ?? null
                };
            } else {
                metricas = buildMetricsFromSnapshot(raw.line_snapshot || {});
            }
        }

        if (!metricas) { skipped++; continue; }
        const hasAny = Object.values(metricas).some(v => v !== null);
        if (!hasAny) { skipped++; continue; }

        try {
            const summary = existing || {};
            summary.metricas = metricas;

            await query(
                "UPDATE flexo_products SET raw_data = raw_data || jsonb_build_object('resumen_creacion', $2::jsonb) WHERE product_code = $1",
                [row.product_code, JSON.stringify(summary)]
            );
            updated++;
            console.log('  OK', row.product_code, '| metricas:', Object.values(metricas).filter(v => v !== null).length, 'campos');
        } catch (e) {
            errors++;
            console.log('  ERR', row.product_code, e.message);
        }
    }
    console.log('  Resultado: actualizadas=' + updated + ' saltadas=' + skipped + ' errores=' + errors);
    return { updated, skipped, errors };
}

(async () => {
    console.log('Iniciando migración de resumen_creacion con métricas...\n');
    const ord = await migrateOrders();
    const prod = await migrateProducts();
    console.log('\n=== Resumen final ===');
    console.log('Órdenes:  actualizadas=' + ord.updated + ' saltadas=' + ord.skipped + ' errores=' + ord.errors);
    console.log('Productos: actualizadas=' + prod.updated + ' saltadas=' + prod.skipped + ' errores=' + prod.errors);
    console.log('Migración completada.');
})().catch(e => console.error('Error fatal:', e));
