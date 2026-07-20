const { ErrorAplicacion } = require('./tintas-errors');

// ─── CONVERSION DE UNIDADES ───────────────────────────────────────────────

const FAMILIA = { G: 'PESO', KG: 'PESO', LB: 'PESO', OZ: 'PESO', ML: 'VOLUMEN', L: 'VOLUMEN', GAL: 'VOLUMEN' };
const A_BASE = { G: 1, KG: 1000, LB: 453.59237, OZ: 28.349523125, ML: 1, L: 1000, GAL: 3785.411784 };

function familiaDe(unidad) {
  const u = String(unidad).toUpperCase();
  if (!FAMILIA[u]) throw new Error(`Unidad no soportada: ${unidad}`);
  return FAMILIA[u];
}

function convertirUnidad(cantidad, unidadOrigen, unidadDestino) {
  const uo = String(unidadOrigen).toUpperCase();
  const ud = String(unidadDestino).toUpperCase();
  if (uo === ud) return cantidad;
  if (familiaDe(uo) !== familiaDe(ud)) throw new Error(`No se puede convertir ${uo} a ${ud} sin densidad.`);
  return (cantidad * A_BASE[uo]) / A_BASE[ud];
}

function calcularComponentes(componentes, cantidadTotal, unidadTotal, unidadSalida) {
  if (!componentes || !componentes.length) throw new Error('La receta no tiene componentes.');
  const us = unidadSalida || unidadTotal;
  const suma = componentes.reduce((a, c) => a + Number(c.porcentaje), 0);
  const advertencia = Math.abs(suma - 100) > 0.5
    ? `Los porcentajes suman ${suma.toFixed(2)}%, no 100%.`
    : null;
  const resultado = componentes.map(c => {
    const pct = Number(c.porcentaje);
    const cant = Number(convertirUnidad(cantidadTotal * (pct / 100), unidadTotal, us).toFixed(4));
    return { producto_tinta_id: c.producto_tinta_id, nombre: c.nombre, porcentaje: pct, cantidad: cant, unidad_medida: us };
  });
  return { cantidad_total_solicitada: cantidadTotal, unidad_total: unidadTotal, suma_porcentajes: Number(suma.toFixed(3)), advertencia, componentes: resultado };
}

// ─── HELPERS DB ────────────────────────────────────────────────────────────

function schema() { return 'tintas'; }

// ─── PRODUCTOS SERVICE ─────────────────────────────────────────────────────

async function listarProductos(pgQuery, filtros = {}) {
  const condiciones = ['1=1']; const params = [];
  if (filtros.tipo) { params.push(filtros.tipo); condiciones.push(`p.tipo = $${params.length}`); }
  if (filtros.estado) { params.push(filtros.estado); condiciones.push(`p.estado = $${params.length}`); }
  if (filtros.texto) { params.push(`%${filtros.texto}%`); condiciones.push(`(p.nombre ILIKE $${params.length} OR p.codigo_interno ILIKE $${params.length} OR p.codigo_sap ILIKE $${params.length})`); }
  const { rows } = await pgQuery(
    `SELECT p.*, f.nombre AS familia_nombre, m.nombre AS marca_nombre, fab.nombre AS fabricante_nombre
     FROM tintas.productos p
     LEFT JOIN tintas.familias f ON f.id = p.familia_id
     LEFT JOIN tintas.marcas m ON m.id = p.marca_id
     LEFT JOIN tintas.fabricantes fab ON fab.id = p.fabricante_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY p.nombre`, params);
  return rows;
}

async function obtenerProducto(pgQuery, id) {
  const { rows } = await pgQuery(`SELECT * FROM tintas.productos WHERE id = $1`, [id]);
  if (!rows[0]) throw new ErrorAplicacion('Producto no encontrado', 404);
  return rows[0];
}

async function crearProducto(pgQuery, withTransaction, datos, usuarioId) {
  return withTransaction(async (client) => {
    const { codigo_sap, codigo_interno, origen_inventario = 'ERP_LOCAL', nombre, tipo, familia_id, fabricante_id, marca_id, proveedor_id, color, pantone_base_id, unidad_medida_base = 'KG', peso_por_envase, vida_util_dias, costo_promedio = 0, costo_ultimo = 0, ubicacion_defecto_id, equivalencias, configuraciones, observaciones } = datos;
    if (!codigo_interno || !nombre || !tipo) throw new ErrorAplicacion('codigo_interno, nombre y tipo son obligatorios.', 422);
    const { rows } = await client.query(
      `INSERT INTO tintas.productos (codigo_sap, codigo_interno, origen_inventario, nombre, tipo, familia_id, fabricante_id, marca_id, proveedor_id, color, pantone_base_id, unidad_medida_base, peso_por_envase, vida_util_dias, costo_promedio, costo_ultimo, ubicacion_defecto_id, equivalencias, configuraciones, observaciones, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21) RETURNING *`,
      [codigo_sap, codigo_interno, origen_inventario, nombre, tipo, familia_id, fabricante_id, marca_id, proveedor_id, color, pantone_base_id, unidad_medida_base, peso_por_envase, vida_util_dias, costo_promedio, costo_ultimo, ubicacion_defecto_id, equivalencias, configuraciones, observaciones, usuarioId]);
    return rows[0];
  });
}

async function actualizarProducto(pgQuery, withTransaction, id, datos, usuarioId) {
  return withTransaction(async (client) => {
    const campos = ['nombre','tipo','familia_id','fabricante_id','marca_id','proveedor_id','color','pantone_base_id','peso_por_envase','vida_util_dias','ubicacion_defecto_id','equivalencias','configuraciones','observaciones','estado','costo_promedio','costo_ultimo'];
    const sets = []; const params = [];
    for (const c of campos) {
      if (Object.prototype.hasOwnProperty.call(datos, c)) { params.push(datos[c]); sets.push(`${c} = $${params.length}`); }
    }
    if (!sets.length) throw new ErrorAplicacion('No se envio ningun campo para actualizar.', 422);
    params.push(usuarioId); sets.push(`actualizado_por = $${params.length}`, `actualizado_en = now()`);
    params.push(id);
    const { rows } = await client.query(`UPDATE tintas.productos SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    return rows[0];
  });
}

// ─── LOTES SERVICE ─────────────────────────────────────────────────────────

async function listarLotesPorProducto(pgQuery, producto_id) {
  const { rows } = await pgQuery(
    `SELECT l.*, u.descripcion AS ubicacion_descripcion FROM tintas.lotes l LEFT JOIN tintas.ubicaciones u ON u.id = l.ubicacion_id WHERE l.producto_id = $1 ORDER BY l.fecha_vencimiento ASC NULLS LAST`, [producto_id]);
  return rows;
}

async function lotesProximosAVencer(pgQuery, dias = 30) {
  const { rows } = await pgQuery(
    `SELECT l.*, p.nombre AS producto_nombre, p.codigo_interno FROM tintas.lotes l JOIN tintas.productos p ON p.id = l.producto_id WHERE l.estado = 'ACTIVO' AND l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento <= (CURRENT_DATE + ($1 || ' days')::interval) ORDER BY l.fecha_vencimiento ASC`, [dias]);
  return rows;
}

async function crearLote(pgQuery, withTransaction, datos, usuarioId) {
  return withTransaction(async (client) => {
    const { producto_id, lote, sap_codigo_lote, fecha_fabricacion, fecha_vencimiento, peso_neto, unidad_medida = 'KG', costo_lote = 0, ubicacion_id, origen_inventario = 'ERP_LOCAL', observaciones, referencia_documento } = datos;
    if (!producto_id || !lote || !peso_neto) throw new ErrorAplicacion('producto_id, lote y peso_neto son obligatorios.', 422);
    const { rows } = await client.query(
      `INSERT INTO tintas.lotes (producto_id, lote, sap_codigo_lote, fecha_fabricacion, fecha_vencimiento, peso_neto, peso_disponible, unidad_medida, costo_lote, ubicacion_id, origen_inventario, observaciones, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING *`,
      [producto_id, lote, sap_codigo_lote, fecha_fabricacion, fecha_vencimiento, peso_neto, unidad_medida, costo_lote, ubicacion_id, origen_inventario, observaciones, usuarioId]);
    await registrarMovimiento(client, { producto_id, lote_id: rows[0].id, tipo: 'ENTRADA', cantidad: peso_neto, unidad_medida, costo_unitario: costo_lote, ubicacion_destino_id: ubicacion_id, referencia_documento, usuario_id: usuarioId, observaciones: 'Alta de lote' });
    return rows[0];
  });
}

async function ajustarLote(pgQuery, withTransaction, { lote_id, cantidad, tipo, motivo }, usuarioId) {
  if (!['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'].includes(tipo)) throw new ErrorAplicacion('tipo debe ser AJUSTE_POSITIVO o AJUSTE_NEGATIVO', 422);
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT producto_id, unidad_medida, costo_lote, origen_inventario FROM tintas.lotes WHERE id = $1 FOR UPDATE`, [lote_id]);
    if (!rows[0]) throw new ErrorAplicacion('Lote no encontrado', 404);
    if (rows[0].origen_inventario === 'SAP') throw new ErrorAplicacion('Lote administrado desde SAP; ajustes deben hacerse alla.', 409);
    return registrarMovimiento(client, { producto_id: rows[0].producto_id, lote_id, tipo, cantidad, unidad_medida: rows[0].unidad_medida, costo_unitario: rows[0].costo_lote, usuario_id: usuarioId, observaciones: motivo || 'Ajuste manual' });
  });
}

// ─── MOVIMIENTOS SERVICE ───────────────────────────────────────────────────

const TIPOS_SUMAN = new Set(['ENTRADA', 'AJUSTE_POSITIVO', 'DEVOLUCION']);
const TIPOS_RESTAN = new Set(['SALIDA', 'AJUSTE_NEGATIVO', 'CONSUMO_PRODUCCION', 'MERMA']);

async function registrarMovimiento(client, datos) {
  const { producto_id, lote_id, tipo, cantidad, unidad_medida, costo_unitario = 0, ubicacion_origen_id, ubicacion_destino_id, orden_produccion_id, referencia_documento, origen_sistema = 'ERP', usuario_id, observaciones } = datos;
  if (cantidad <= 0) throw new ErrorAplicacion('La cantidad debe ser mayor a cero.', 422);
  if (tipo === 'TRANSFERENCIA') {
    if (!lote_id) throw new ErrorAplicacion('Transferencia requiere lote_id.', 422);
    if (!ubicacion_destino_id) throw new ErrorAplicacion('Transferencia requiere ubicacion_destino_id.', 422);
    await client.query(`UPDATE tintas.lotes SET ubicacion_id = $1, actualizado_en = now() WHERE id = $2`, [ubicacion_destino_id, lote_id]);
  } else if (TIPOS_RESTAN.has(tipo)) {
    if (!lote_id) throw new ErrorAplicacion(`Movimiento tipo ${tipo} requiere lote_id.`, 422);
    const { rows } = await client.query(`UPDATE tintas.lotes SET peso_disponible = peso_disponible - $1, actualizado_en = now() WHERE id = $2 AND peso_disponible >= $1 RETURNING id, peso_disponible`, [cantidad, lote_id]);
    if (!rows.length) throw new ErrorAplicacion('Existencia insuficiente en el lote.', 409);
  } else if (TIPOS_SUMAN.has(tipo)) {
    if (!lote_id) throw new ErrorAplicacion(`Movimiento tipo ${tipo} requiere lote_id.`, 422);
    await client.query(`UPDATE tintas.lotes SET peso_disponible = peso_disponible + $1, actualizado_en = now() WHERE id = $2`, [cantidad, lote_id]);
  }
  const ct = Number(cantidad) * Number(costo_unitario);
  const { rows } = await client.query(
    `INSERT INTO tintas.movimientos (producto_id, lote_id, tipo, cantidad, unidad_medida, costo_unitario, costo_total, ubicacion_origen_id, ubicacion_destino_id, orden_produccion_id, referencia_documento, origen_sistema, usuario_id, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [producto_id, lote_id, tipo, cantidad, unidad_medida, costo_unitario, ct, ubicacion_origen_id, ubicacion_destino_id, orden_produccion_id, referencia_documento, origen_sistema, usuario_id, observaciones]);
  return rows[0];
}

async function seleccionarLotesFIFO(client, producto_id, cantidadNecesaria) {
  const { rows: lotes } = await client.query(
    `SELECT id, peso_disponible, costo_lote FROM tintas.lotes WHERE producto_id = $1 AND estado = 'ACTIVO' AND peso_disponible > 0 ORDER BY fecha_vencimiento ASC NULLS LAST, fecha_fabricacion ASC NULLS LAST FOR UPDATE`, [producto_id]);
  const asignaciones = []; let restante = Number(cantidadNecesaria);
  for (const l of lotes) {
    if (restante <= 0) break;
    const d = Number(l.peso_disponible);
    const t = Math.min(d, restante);
    if (t > 0) { asignaciones.push({ lote_id: l.id, cantidad: t, costo_unitario: Number(l.costo_lote) }); restante -= t; }
  }
  if (restante > 0.0001) throw new ErrorAplicacion(`Existencia insuficiente: faltan ${restante.toFixed(4)} unidades.`, 409);
  return asignaciones;
}

// ─── PANTONES SERVICE ──────────────────────────────────────────────────────

async function buscarBiblioteca(pgQuery, filtros = {}) {
  const condiciones = ['1=1']; const params = [];
  if (filtros.codigo_pantone) { params.push(filtros.codigo_pantone); condiciones.push(`codigo_pantone = $${params.length}`); }
  if (filtros.nombre) { params.push(`%${filtros.nombre}%`); condiciones.push(`nombre ILIKE $${params.length}`); }
  if (filtros.texto) { params.push(`%${filtros.texto}%`); condiciones.push(`(codigo_pantone ILIKE $${params.length} OR nombre ILIKE $${params.length})`); }
  const sql = `SELECT * FROM tintas.pantones_biblioteca WHERE ${condiciones.join(' AND ')} ORDER BY frecuencia_uso DESC, codigo_pantone`;
  const { rows } = await pgQuery(sql, params);
  return rows;
}

async function crearPantone(pgQuery, withTransaction, datos, usuarioId) {
  return withTransaction(async (client) => {
    const { codigo_pantone, nombre, color_hex, descripcion } = datos;
    if (!codigo_pantone) throw new ErrorAplicacion('codigo_pantone es obligatorio.', 422);
    const { rows } = await client.query(
      `INSERT INTO tintas.pantones_biblioteca (codigo_pantone, nombre, color_hex, descripcion, creado_por, actualizado_por) VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
      [codigo_pantone, nombre, color_hex, descripcion, usuarioId]);
    return rows[0];
  });
}

async function obtenerReceta(pgQuery, receta_id) {
  const { rows: r } = await pgQuery(`SELECT * FROM tintas.pantones_recetas WHERE id = $1`, [receta_id]);
  if (!r[0]) throw new ErrorAplicacion('Receta no encontrada', 404);
  const { rows: c } = await pgQuery(
    `SELECT rc.*, p.nombre, p.codigo_interno, p.unidad_medida_base FROM tintas.pantones_receta_componentes rc JOIN tintas.productos p ON p.id = rc.producto_tinta_id WHERE rc.receta_id = $1 ORDER BY rc.orden`, [receta_id]);
  return { ...r[0], componentes: c };
}

async function listarRecetas(pgQuery, filtros = {}) {
  const condiciones = ['1=1']; const params = [];
  if (filtros.pantone_id) { params.push(filtros.pantone_id); condiciones.push(`pantone_id = $${params.length}`); }
  if (filtros.cliente_id) { params.push(filtros.cliente_id); condiciones.push(`cliente_id = $${params.length}`); }
  if (filtros.producto_id) { params.push(filtros.producto_id); condiciones.push(`producto_id = $${params.length}`); }
  if (filtros.estado) { params.push(filtros.estado); condiciones.push(`estado = $${params.length}`); }
  const { rows } = await pgQuery(`SELECT * FROM tintas.pantones_recetas WHERE ${condiciones.join(' AND ')} ORDER BY creado_en DESC`, params);
  return rows;
}

async function crearReceta(pgQuery, withTransaction, datos, usuarioId) {
  return withTransaction(async (client) => {
    const { codigo_interno, nombre, pantone_id, cliente_id, producto_id, orden_produccion_id, estado = 'BORRADOR', observaciones, componentes } = datos;
    if (!codigo_interno || !nombre) throw new ErrorAplicacion('codigo_interno y nombre son obligatorios.', 422);
    if (!componentes || !componentes.length) throw new ErrorAplicacion('La receta necesita al menos un componente.', 422);
    const { rows } = await client.query(
      `INSERT INTO tintas.pantones_recetas (codigo_interno, nombre, pantone_id, cliente_id, producto_id, orden_produccion_id, version, estado, usuario_creador_id, observaciones) VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9) RETURNING *`,
      [codigo_interno, nombre, pantone_id, cliente_id, producto_id, orden_produccion_id, estado, usuarioId, observaciones]);
    let orden = 0;
    for (const c of componentes) {
      orden += 1;
      await client.query(
        `INSERT INTO tintas.pantones_receta_componentes (receta_id, producto_tinta_id, porcentaje, orden, observaciones) VALUES ($1,$2,$3,$4,$5)`,
        [rows[0].id, c.producto_tinta_id, c.porcentaje, c.orden || orden, c.observaciones || null]);
    }
    return obtenerReceta(pgQuery, rows[0].id);
  });
}

async function duplicarReceta(pgQuery, withTransaction, receta_id, usuarioId) {
  return withTransaction(async (client) => {
    const original = await obtenerReceta(pgQuery, receta_id);
    const cadenaRaiz = original.receta_padre_id || original.id;
    const { rows: maxV } = await client.query(`SELECT COALESCE(MAX(version),0) AS mv FROM tintas.pantones_recetas WHERE id=$1 OR receta_padre_id=$1`, [cadenaRaiz]);
    const nv = Number(maxV[0].mv) + 1;
    const { rows } = await client.query(
      `INSERT INTO tintas.pantones_recetas (codigo_interno, nombre, pantone_id, cliente_id, producto_id, orden_produccion_id, version, receta_padre_id, estado, usuario_creador_id, observaciones) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BORRADOR',$9,$10) RETURNING *`,
      [`${original.codigo_interno}-v${nv}`, original.nombre, original.pantone_id, original.cliente_id, original.producto_id, original.orden_produccion_id, nv, cadenaRaiz, usuarioId, original.observaciones]);
    for (const c of original.componentes) {
      await client.query(`INSERT INTO tintas.pantones_receta_componentes (receta_id, producto_tinta_id, porcentaje, orden) VALUES ($1,$2,$3,$4)`, [rows[0].id, c.producto_tinta_id, c.porcentaje, c.orden || 1]);
    }
    return obtenerReceta(pgQuery, rows[0].id);
  });
}

async function marcarRecetaVigente(pgQuery, withTransaction, receta_id, usuarioId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT id, receta_padre_id FROM tintas.pantones_recetas WHERE id=$1`, [receta_id]);
    if (!rows[0]) throw new ErrorAplicacion('Receta no encontrada', 404);
    const cr = rows[0].receta_padre_id || rows[0].id;
    await client.query(`UPDATE tintas.pantones_recetas SET es_vigente=FALSE, estado=CASE WHEN estado='VIGENTE' THEN 'ARCHIVADO' ELSE estado END, actualizado_por=$1, actualizado_en=now() WHERE (id=$2 OR receta_padre_id=$2) AND id<>$3`, [usuarioId, cr, receta_id]);
    const { rows: u } = await client.query(`UPDATE tintas.pantones_recetas SET es_vigente=TRUE, estado='VIGENTE', actualizado_por=$1, actualizado_en=now() WHERE id=$2 RETURNING *`, [usuarioId, receta_id]);
    return u[0];
  });
}

async function compararVersiones(pgQuery, idA, idB) {
  const [a, b] = await Promise.all([obtenerReceta(pgQuery, idA), obtenerReceta(pgQuery, idB)]);
  const mA = new Map(a.componentes.map(c => [c.producto_tinta_id, c.porcentaje]));
  const mB = new Map(b.componentes.map(c => [c.producto_tinta_id, c.porcentaje]));
  const todos = new Set([...mA.keys(), ...mB.keys()]);
  const diferencias = [...todos].map(id => ({ producto_tinta_id: id, porcentaje_a: mA.get(id) || 0, porcentaje_b: mB.get(id) || 0, diferencia: (mB.get(id) || 0) - (mA.get(id) || 0) })).filter(d => d.diferencia !== 0 || !mA.has(d.producto_tinta_id) || !mB.has(d.producto_tinta_id));
  return { receta_a: a, receta_b: b, diferencias };
}

async function calcularProduccion(pgQuery, receta_id, cantidadTotal, unidadTotal, unidadSalida) {
  const receta = await obtenerReceta(pgQuery, receta_id);
  return calcularComponentes(receta.componentes, cantidadTotal, unidadTotal, unidadSalida || unidadTotal);
}

// ─── CONSUMO SERVICE ───────────────────────────────────────────────────────

async function previsualizarConsumo(pgQuery, receta_id, cantidad_producida, unidad_medida) {
  const receta = await obtenerReceta(pgQuery, receta_id);
  const calculo = calcularComponentes(receta.componentes, cantidad_producida, unidad_medida);
  for (const item of calculo.componentes) {
    const { rows } = await pgQuery(`SELECT COALESCE(SUM(peso_disponible),0) AS disponible FROM tintas.lotes WHERE producto_id=$1 AND estado='ACTIVO'`, [item.producto_tinta_id]);
    item.existencia_disponible = Number(rows[0].disponible);
    item.suficiente = item.existencia_disponible >= item.cantidad;
  }
  return calculo;
}

async function procesarCierreOrden(pgQuery, withTransaction, params) {
  const { orden_produccion_id, receta_id, cantidad_producida, unidad_medida = 'KG', costos_referencia = {}, usuario_id } = params;
  if (!orden_produccion_id || !cantidad_producida) throw new ErrorAplicacion('orden_produccion_id y cantidad_producida son obligatorios.', 422);
  return withTransaction(async (client) => {
    const existente = await client.query(`SELECT id FROM tintas.consumo_orden WHERE orden_produccion_id=$1`, [orden_produccion_id]);
    if (existente.rows[0]) throw new ErrorAplicacion('Esta orden ya tiene un consumo registrado.', 409);
    let componentes = [];
    if (receta_id) {
      const { rows } = await client.query(
        `SELECT rc.producto_tinta_id, rc.porcentaje, p.nombre, p.unidad_medida_base FROM tintas.pantones_receta_componentes rc JOIN tintas.productos p ON p.id=rc.producto_tinta_id WHERE rc.receta_id=$1 ORDER BY rc.orden`, [receta_id]);
      if (!rows.length) throw new ErrorAplicacion('La receta no tiene componentes.', 422);
      componentes = rows;
    }
    const { rows: cabe } = await client.query(
      `INSERT INTO tintas.consumo_orden (orden_produccion_id, receta_id, cantidad_producida, unidad_medida, fecha_cierre, usuario_id, estado, costo_por_metro, costo_por_pie_lineal, costo_por_etiqueta, costo_por_trabajo)
       VALUES ($1,$2,$3,$4,now(),$5,'PENDIENTE',$6,$7,$8,$9) RETURNING *`,
      [orden_produccion_id, receta_id || null, cantidad_producida, unidad_medida, usuario_id,
       (costos_referencia.costo_por_metro || null), (costos_referencia.costo_por_pie_lineal || null),
       (costos_referencia.costo_por_etiqueta || null), (costos_referencia.costo_por_trabajo || null)]);
    let costoTotalConsumido = 0;
    if (componentes.length) {
      const calculo = calcularComponentes(componentes, cantidad_producida, unidad_medida);
      for (const item of calculo.componentes) {
        const asignaciones = await seleccionarLotesFIFO(client, item.producto_tinta_id, item.cantidad);
        for (const asign of asignaciones) {
          const ca = asign.cantidad * asign.costo_unitario;
          costoTotalConsumido += ca;
          const mov = await registrarMovimiento(client, { producto_id: item.producto_tinta_id, lote_id: asign.lote_id, tipo: 'CONSUMO_PRODUCCION', cantidad: asign.cantidad, unidad_medida, costo_unitario: asign.costo_unitario, orden_produccion_id, referencia_documento: `ORDEN-${orden_produccion_id}`, usuario_id, observaciones: `Descarga por cierre de orden (receta ${receta_id})` });
          await client.query(`INSERT INTO tintas.consumo_detalle (consumo_id, producto_tinta_id, lote_id, cantidad_calculada, cantidad_real_consumida, unidad_medida, costo_unitario, costo_total, movimiento_id, operador_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [cabe[0].id, item.producto_tinta_id, asign.lote_id, item.cantidad, asign.cantidad, unidad_medida, asign.costo_unitario, ca, mov.id, usuario_id]);
        }
      }
    }
    const cpk = unidad_medida === 'KG' && cantidad_producida > 0 ? costoTotalConsumido / cantidad_producida : null;
    await client.query(`UPDATE tintas.consumo_orden SET costo_total_consumido=$1, costo_por_kg=$2, estado='PROCESADO', actualizado_en=now() WHERE id=$3`, [costoTotalConsumido, cpk, cabe[0].id]);
    return obtenerConsumoConDetalle(client, cabe[0].id);
  });
}

async function obtenerConsumoConDetalle(clientOrQuery, consumo_id) {
  const q = clientOrQuery.query ? clientOrQuery : { query: clientOrQuery };
  const { rows: c } = await q.query(`SELECT * FROM tintas.consumo_orden WHERE id=$1`, [consumo_id]);
  if (!c[0]) throw new ErrorAplicacion('Consumo no encontrado', 404);
  const { rows: d } = await q.query(
    `SELECT cd.*, p.nombre AS producto_nombre, l.lote AS lote_codigo FROM tintas.consumo_detalle cd JOIN tintas.productos p ON p.id=cd.producto_tinta_id LEFT JOIN tintas.lotes l ON l.id=cd.lote_id WHERE cd.consumo_id=$1`, [consumo_id]);
  return { ...c[0], detalle: d };
}

async function consumoPorOrden(pgQuery, orden_produccion_id) {
  const { rows } = await pgQuery(`SELECT id FROM tintas.consumo_orden WHERE orden_produccion_id=$1`, [orden_produccion_id]);
  if (!rows[0]) return null;
  return obtenerConsumoConDetalle(pgQuery, rows[0].id);
}

// ─── DASHBOARD SERVICE ─────────────────────────────────────────────────────

async function existenciasActuales(pgQuery) {
  const { rows } = await pgQuery(`SELECT * FROM tintas.vw_existencias_actuales ORDER BY nombre`);
  return rows;
}

async function lotesProximosVencer(pgQuery) {
  const { rows } = await pgQuery(`SELECT * FROM tintas.vw_lotes_proximos_vencer ORDER BY fecha_vencimiento`);
  return rows;
}

async function consumoMensual(pgQuery, meses = 12) {
  const { rows } = await pgQuery(
    `SELECT * FROM tintas.vw_consumo_mensual WHERE mes >= date_trunc('month',now()) - ($1||' months')::interval ORDER BY mes DESC, costo_total DESC`, [meses]);
  return rows;
}

async function tintasMasUtilizadas(pgQuery, limite = 10) {
  const { rows } = await pgQuery(`SELECT * FROM tintas.vw_tintas_mas_utilizadas LIMIT $1`, [limite]);
  return rows;
}

async function consumoPorCliente(pgQuery) {
  const { rows } = await pgQuery(
    `SELECT bp.id AS cliente_id, bp.partner_name AS cliente_nombre, SUM(cd.costo_total) AS costo_total, COUNT(DISTINCT co.orden_produccion_id) AS ordenes
     FROM tintas.consumo_detalle cd JOIN tintas.consumo_orden co ON co.id=cd.consumo_id
     JOIN tintas.pantones_recetas r ON r.id=co.receta_id
     JOIN business_partners bp ON bp.id=r.cliente_id
     GROUP BY bp.id, bp.partner_name ORDER BY costo_total DESC`);
  return rows;
}

async function productosSinMovimiento(pgQuery, dias = 90) {
  const { rows } = await pgQuery(
    `SELECT p.id, p.nombre, p.codigo_interno, MAX(m.fecha) AS ultimo_movimiento
     FROM tintas.productos p LEFT JOIN tintas.movimientos m ON m.producto_id=p.id
     WHERE p.estado='ACTIVO'
     GROUP BY p.id, p.nombre, p.codigo_interno
     HAVING MAX(m.fecha) IS NULL OR MAX(m.fecha) < (now() - ($1||' days')::interval)
     ORDER BY ultimo_movimiento ASC NULLS FIRST`, [dias]);
  return rows;
}

async function rotacionInventario(pgQuery) {
  const { rows } = await pgQuery(
    `SELECT e.producto_id, e.nombre, e.existencia_total, COALESCE(c.consumo_12m,0) AS consumo_12m,
     CASE WHEN e.existencia_total>0 THEN ROUND((COALESCE(c.consumo_12m,0)/e.existencia_total)::numeric,2) ELSE NULL END AS rotacion
     FROM tintas.vw_existencias_actuales e
     LEFT JOIN (SELECT producto_tinta_id, SUM(cantidad_real_consumida) AS consumo_12m FROM tintas.consumo_detalle WHERE fecha_hora >= now()-INTERVAL '12 months' GROUP BY producto_tinta_id) c ON c.producto_tinta_id=e.producto_id
     ORDER BY rotacion DESC NULLS LAST`);
  return rows;
}

async function trazabilidadPantone(pgQuery, pantone_id) {
  const { rows: p } = await pgQuery(`SELECT * FROM tintas.pantones_biblioteca WHERE id=$1`, [pantone_id]);
  const { rows: rec } = await pgQuery(`SELECT id, codigo_interno, version, estado, es_vigente, cliente_id, producto_id FROM tintas.pantones_recetas WHERE pantone_id=$1 ORDER BY version`, [pantone_id]);
  const { rows: uso } = await pgQuery(
    `SELECT co.id AS consumo_id, co.orden_produccion_id, co.fecha_cierre, co.costo_total_consumido, r.codigo_interno AS receta_codigo, r.cliente_id, cd.producto_tinta_id, cd.lote_id, cd.cantidad_real_consumida, cd.costo_total, p.nombre AS tinta_nombre, p.proveedor_id, l.lote AS lote_codigo
     FROM tintas.pantones_recetas r JOIN tintas.consumo_orden co ON co.receta_id=r.id
     JOIN tintas.consumo_detalle cd ON cd.consumo_id=co.id
     JOIN tintas.productos p ON p.id=cd.producto_tinta_id
     LEFT JOIN tintas.lotes l ON l.id=cd.lote_id
     WHERE r.pantone_id=$1 ORDER BY co.fecha_cierre DESC`, [pantone_id]);
  return { pantone: p[0] || null, recetas: rec, uso };
}

// ─── REGISTRO DE RUTAS ─────────────────────────────────────────────────────

function registerTintasRoutes({ app, pgQuery, withTransaction }) {
  const api = '/api/tintas';

  // ─── Productos ──────────────────────────────────────────────────────────
  app.get(api + '/productos', async (req, res) => {
    try { res.json(await listarProductos(pgQuery, req.query)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/productos/:id', async (req, res) => {
    try { res.json(await obtenerProducto(pgQuery, req.params.id)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/productos/:id/lotes', async (req, res) => {
    try { res.json(await listarLotesPorProducto(pgQuery, req.params.id)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/productos', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.status(201).json(await crearProducto(pgQuery, withTransaction, req.body, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.put(api + '/productos/:id', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.json(await actualizarProducto(pgQuery, withTransaction, req.params.id, req.body, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });

  // ─── Lotes ──────────────────────────────────────────────────────────────
  app.get(api + '/lotes/proximos-a-vencer', async (req, res) => {
    try { res.json(await lotesProximosAVencer(pgQuery, Number(req.query.dias) || 30)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/lotes', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.status(201).json(await crearLote(pgQuery, withTransaction, req.body, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/lotes/:id/ajuste', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.json(await ajustarLote(pgQuery, withTransaction, { ...req.body, lote_id: req.params.id }, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });

  // ─── Movimientos ────────────────────────────────────────────────────────
  app.get(api + '/movimientos', async (req, res) => {
    try {
      const { producto_id, lote_id, tipo, desde, hasta } = req.query;
      const c = []; const p = [];
      if (producto_id) { p.push(producto_id); c.push(`producto_id=$${p.length}`); }
      if (lote_id) { p.push(lote_id); c.push(`lote_id=$${p.length}`); }
      if (tipo) { p.push(tipo); c.push(`tipo=$${p.length}`); }
      if (desde) { p.push(desde); c.push(`fecha>=$${p.length}`); }
      if (hasta) { p.push(hasta); c.push(`fecha<=$${p.length}`); }
      const w = c.length ? `WHERE ${c.join(' AND ')}` : '';
      const { rows } = await pgQuery(`SELECT * FROM tintas.movimientos ${w} ORDER BY fecha DESC LIMIT 500`, p);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.post(api + '/movimientos', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      const r = await withTransaction(client => registrarMovimiento(client, { ...req.body, usuario_id: uid }));
      res.status(201).json(r);
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });

  // ─── Pantones ───────────────────────────────────────────────────────────
  app.get(api + '/pantones/biblioteca', async (req, res) => {
    try { res.json(await buscarBiblioteca(pgQuery, req.query)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/pantones/biblioteca', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.status(201).json(await crearPantone(pgQuery, withTransaction, req.body, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/pantones/biblioteca/:id/trazabilidad', async (req, res) => {
    try { res.json(await trazabilidadPantone(pgQuery, req.params.id)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });

  // ─── Recetas ────────────────────────────────────────────────────────────
  app.get(api + '/pantones/recetas', async (req, res) => {
    try { res.json(await listarRecetas(pgQuery, req.query)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/pantones/recetas/:id', async (req, res) => {
    try { res.json(await obtenerReceta(pgQuery, req.params.id)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/pantones/recetas', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.status(201).json(await crearReceta(pgQuery, withTransaction, req.body, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/pantones/recetas/:id/duplicar', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.status(201).json(await duplicarReceta(pgQuery, withTransaction, req.params.id, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/pantones/recetas/:id/marcar-vigente', async (req, res) => {
    try {
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.json(await marcarRecetaVigente(pgQuery, withTransaction, req.params.id, uid));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/pantones/recetas/comparar/:idA/:idB', async (req, res) => {
    try { res.json(await compararVersiones(pgQuery, req.params.idA, req.params.idB)); } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/pantones/recetas/:id/calcular', async (req, res) => {
    try {
      const { cantidad, unidad, unidad_salida } = req.query;
      if (!cantidad || !unidad) return res.status(422).json({ error: 'cantidad y unidad son obligatorios.' });
      res.json(await calcularProduccion(pgQuery, req.params.id, Number(cantidad), unidad, unidad_salida));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });

  // ─── Consumo ────────────────────────────────────────────────────────────
  app.get(api + '/consumo/previsualizar', async (req, res) => {
    try {
      const { receta_id, cantidad, unidad } = req.query;
      if (!receta_id || !cantidad || !unidad) return res.status(422).json({ error: 'receta_id, cantidad y unidad son obligatorios.' });
      res.json(await previsualizarConsumo(pgQuery, receta_id, Number(cantidad), unidad));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.get(api + '/consumo/orden/:orden_produccion_id', async (req, res) => {
    try {
      const r = await consumoPorOrden(pgQuery, req.params.orden_produccion_id);
      if (!r) return res.status(404).json({ error: 'Esta orden no tiene consumo de tintas registrado.' });
      res.json(r);
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });
  app.post(api + '/consumo/cerrar-orden', async (req, res) => {
    try {
      const token = req.headers['x-webhook-token'];
      if (process.env.TINTAS_WEBHOOK_TOKEN && token !== process.env.TINTAS_WEBHOOK_TOKEN) {
        return res.status(401).json({ error: 'Token de integracion invalido.' });
      }
      const uid = req.body.usuario_id || req.headers['x-usuario-id'];
      res.status(201).json(await procesarCierreOrden(pgQuery, withTransaction, { ...req.body, usuario_id: uid }));
    } catch (e) { res.status(e.status||500).json({ error: e.message }); }
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────
  app.get(api + '/dashboard/existencias', async (req, res) => {
    try { res.json(await existenciasActuales(pgQuery)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(api + '/dashboard/lotes-por-vencer', async (req, res) => {
    try { res.json(await lotesProximosVencer(pgQuery)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(api + '/dashboard/consumo-mensual', async (req, res) => {
    try { res.json(await consumoMensual(pgQuery, Number(req.query.meses) || 12)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(api + '/dashboard/tintas-mas-utilizadas', async (req, res) => {
    try { res.json(await tintasMasUtilizadas(pgQuery, Number(req.query.limite) || 10)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(api + '/dashboard/consumo-por-cliente', async (req, res) => {
    try { res.json(await consumoPorCliente(pgQuery)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(api + '/dashboard/sin-movimiento', async (req, res) => {
    try { res.json(await productosSinMovimiento(pgQuery, Number(req.query.dias) || 90)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(api + '/dashboard/rotacion-inventario', async (req, res) => {
    try { res.json(await rotacionInventario(pgQuery)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { registerTintasRoutes };
