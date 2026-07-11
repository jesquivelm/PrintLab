# Informe Gerencial para Inicio del Proyecto

## Implementacion de cotizacion para flexografia digital y convencional con integracion SAP Business One

### Proposito del documento

Este documento formaliza el arranque del proyecto de cotizacion, costeo y trazabilidad comercial-productiva para flexografia digital y convencional. Su objetivo es alinear a gerencia, ventas, costos, produccion, TI y administracion SAP sobre el alcance real del sistema, las fuentes de informacion necesarias y las decisiones que deben quedar cerradas antes de activar una integracion transaccional con SAP Business One.

El documento esta dividido en dos bloques:

- **Parte 1: Vision operativa y funcional.** Que hace la aplicacion, como se estructura el proceso de cotizacion, que informacion captura y como se convierte una oportunidad comercial en informacion lista para produccion.
- **Parte 2: Requerimientos tecnicos hacia SAP.** Que datos deben leerse, que objetos pueden escribirse, que consultas son correctas y que decisiones debe confirmar gerencia antes de automatizar documentos oficiales en SAP.

---

# PARTE 1: Vision operativa del sistema

La aplicacion es un entorno web especializado para cotizar productos de impresion flexografica, tanto digital como convencional. Su funcion no es solamente calcular un precio; es transformar la informacion comercial y tecnica en una ficha productiva consistente, trazable y reutilizable.

El flujo propuesto es:

1. **Sincronizacion de maestros.** El sistema consulta o importa informacion oficial desde SAP Business One: socios de negocio, articulos, unidades, almacenes, disponibilidad y datos comerciales autorizados.
2. **Cotizacion tecnica.** El vendedor captura las caracteristicas del trabajo: cliente, producto, cantidades, dimensiones, sustrato, troquel, tintas, acabados, maquina, procesos y condiciones comerciales.
3. **Costeo por proceso.** La aplicacion calcula cada etapa productiva con parametros tecnicos: consumo, merma, tiempo maquina, preparacion, insumos, mano de obra y margen.
4. **Catalogo de productos.** Una linea de cotizacion aprobada o recurrente puede convertirse en producto interno. Ese producto queda congelado como ficha de lectura, conserva la data original y puede volver a cotizarse sin redigitar.
5. **Cierre comercial.** Al aprobarse la venta, el sistema debe generar el documento SAP que gerencia defina como oficial: pedido de cliente, orden de produccion, borrador o una combinacion de ellos.
6. **Trazabilidad.** Cada producto conserva historial de cotizaciones, origen, cliente, linea, valores tecnicos y documentos relacionados.

## Alcance funcional confirmado en el sistema

El proyecto ya cuenta con componentes activos para:

- Cotizaciones con multiples lineas.
- Calculo flexografico convencional/digital.
- Catalogos tecnicos de materiales, troqueles, maquinas, procesos y costos.
- Ordenes de produccion internas.
- Socios de negocio.
- Inventario y materiales.
- Configuracion visual, permisos y auditoria.
- Integracion SAP mediante Service Layer y puente DI-API.
- Nuevo modulo **Productos**, que permite convertir una linea cotizada en ficha reutilizable y volver a cotizarla conservando sus caracteristicas.

---

# PARTE 1.1: Desglose tecnico del calculo

## 1. Troquel

El troquel define la arquitectura fisica del producto. Sus variables principales son:

- Filas o cavidades al ancho.
- Repeticiones a lo largo.
- Dientes del cilindro.
- Desarrollo.
- Distorsion o elongacion.
- Forma y dimensiones.

Esta informacion determina avances, repeticiones, largo efectivo, montaje y compatibilidad con maquina.

**Fuente recomendada:** catalogo interno de troqueles, articulos SAP si el utillaje esta registrado como item, o campos definidos por usuario cuando SAP no contiene la ficha tecnica completa.

## 2. Sustrato

El sustrato se calcula por consumo lineal y area:

- Pies o metros lineales requeridos.
- Area en MSI o m2.
- Ancho de bobina.
- Cantidad solicitada.
- Merma de arranque.
- Merma porcentual o tecnica.
- Unidad de costeo: MSI, kg, m2, metro lineal o pie lineal.

**Fuente recomendada:** SAP para articulo, unidad, existencia y costo base; tabla local para factores tecnicos que SAP no maneje, como ancho util, gramaje operativo, costo MSI industrial o rendimiento.

## 3. Diseno / Arte

El costo se determina por tiempo de preparacion digital, complejidad, cantidad de artes o si el trabajo es nuevo/modificacion/repeticion.

**Fuente recomendada:** configuracion local de costos internos.

## 4. Preprensa

El calculo contempla base operativa y cambios:

```text
Costo preprensa cambios =
(Cantidad de cambios - 1) x (Minutos por cambio / 60) x Tarifa hora preprensa
```

**Fuente recomendada:** configuracion administrativa local. SAP no suele contener estos parametros con el nivel de detalle requerido para cotizacion tecnica.

## 5. Planchas flexograficas

El costo se compone de:

- Polimero virgen.
- Area de plancha.
- Grabado laser/CDI.
- Revelado.
- Limpieza.
- Secado/curado.
- Cantidad de tintas o estaciones.

**Fuente recomendada:** materiales base desde SAP si existen como articulos; tarifas de proceso desde configuracion local.

## 6. Impresion, tintas y macula

El tiraje se calcula por consumo lineal y velocidad:

```text
Tiempo operativo =
Pies o metros lineales con merma / velocidad maquina
```

El costo de tinta depende de:

- Area impresa.
- Cobertura.
- Perfil de tinta.
- CMYK.
- Pantones.
- Blanco.
- Doble blanco.
- Barnices o capas inline.

La macula puede definirse por pies fijos, porcentaje, montaje por estacion o combinaciones segun maquina.

**Fuente recomendada:** configuracion local para velocidad, setup, montaje y macula; SAP para articulos de tinta si se desea traer costo base o existencia.

## 7. Acabados

Incluye laminado, barniz, estampado, embosado, numerado, troquelado, rebobinado y otros procesos.

Cada acabado debe poder costearse por:

- Area.
- Metro/pie lineal.
- Unidad.
- Tiempo maquina.
- Setup.
- Insumo directo.
- Costo fijo externo.

**Fuente recomendada:** SAP para insumos controlados; configuracion local para velocidades, setup y reglas tecnicas.

## 8. Empaque y despacho

Considera:

- Cores.
- Cajas.
- Etiquetas internas.
- Sellos.
- Operarios.
- Tiempo de empaque.
- Rebobinado final.
- Preparacion de despacho.

**Fuente recomendada:** articulos SAP para materiales consumibles; tarifa local para mano de obra y productividad.

## 9. Escalera comercial

El precio final se construye sobre el costo tecnico acumulado:

- Costo directo.
- Costos indirectos.
- Imprevistos.
- Cargas financieras.
- Margen.
- Descuentos.
- Comisiones.
- Impuestos.

**Fuente recomendada:** parametros comerciales locales aprobados por gerencia. SAP puede recibir el resultado final, pero no necesariamente debe gobernar la formula de cotizacion.

---

# PARTE 2: Integracion SAP Business One

## 2.1 Decision arquitectonica

La redaccion original indicaba que la integracion seria estrictamente por **SAP DI-API**. Esa afirmacion debe corregirse.

El sistema actual ya contempla integracion por **SAP Service Layer** como via principal y un puente **DI-API** como alternativa. Esta arquitectura es mas sana para una aplicacion web:

- **Service Layer** es HTTP/OData, mas natural para servicios web, servidores modernos, trazabilidad, autenticacion por sesion y despliegues desacoplados.
- **DI-API** es COM/Windows, util cuando el ambiente SAP lo requiere, pero normalmente necesita un conector intermedio instalado en Windows con SAP Business One Client, permisos, licencia y acceso directo al company database.

**Conclusion tecnica:** la integracion debe definirse como compatible con SAP Business One mediante Service Layer y/o conector DI-API, no como DI-API estricta.

## 2.2 Socios de negocio

### Objeto SAP

- Service Layer: `BusinessPartners`
- DI-API: `BusinessPartners`
- Tablas base: `OCRD`, `CRD1`, `OCPR`

### Uso en el proceso

El sistema necesita leer clientes y prospectos para:

- Asociar cotizaciones a cliente real.
- Heredar moneda, condiciones, vendedor o lista comercial si aplica.
- Evitar duplicidad de clientes.
- Registrar trazabilidad comercial.
- Crear cotizaciones y documentos con `CardCode` valido.

### Consulta SQL recomendada

```sql
SELECT
    T0.CardCode,
    T0.CardName,
    T0.CardType,
    T0.Currency,
    T0.LicTradNum,
    T0.Phone1,
    T0.E_Mail,
    T0.CntctPrsn,
    T0.GroupCode,
    T0.ListNum
FROM OCRD T0
WHERE T0.validFor = 'Y'
  AND T0.frozenFor = 'N'
  AND T0.CardType IN ('C', 'L');
```

### Consulta Service Layer equivalente

```http
GET /b1s/v1/BusinessPartners?$select=CardCode,CardName,CardType,Currency,FederalTaxID,Phone1,EmailAddress,ContactPerson,GroupCode,PriceListNum&$filter=Valid eq 'tYES' and Frozen eq 'tNO'
```

La forma exacta del filtro puede variar por version/localizacion. En algunos ambientes se usa `CardType eq 'C'` y en otros `CardType eq 'cCustomer'`. Debe probarse contra el ambiente real.

## 2.3 Articulos, materiales y consumibles

### Objetos y tablas

- Service Layer: `Items`
- DI-API: `Items`
- Maestro de articulos: `OITM`
- Stock por almacen: `OITW`
- Maestro de almacenes: `OWHS`
- Grupos de articulos: `OITB`
- Precios por lista: `ITM1`

### Punto critico sobre precios

`ITM1` no debe asumirse como fuente principal de costo tecnico.

`ITM1` contiene precios por lista. Es util si SAP maneja listas oficiales para venta, referencia comercial o costos estandarizados por lista. Sin embargo, para costeo industrial de flexografia puede no representar el costo real de consumo.

Por eso, el criterio recomendado es:

- Usar `OITM` para identificar el articulo.
- Usar `OITW` para existencia por almacen.
- Usar `OITM.AvgPrice`, costo promedio por almacen si esta disponible, ultimo costo de compra o UDFs si el costo industrial vive ahi.
- Usar `ITM1` solo si gerencia confirma que una lista especifica representa el precio oficial que debe usar la cotizacion.
- Mantener en la aplicacion costos tecnicos locales cuando SAP no tenga variables como MSI, kg, cobertura, rendimiento, ancho util o gramaje operativo.

### Consulta SQL recomendada para materiales

```sql
SELECT
    T0.ItemCode,
    T0.ItemName,
    T0.ItmsGrpCod,
    T3.ItmsGrpNam,
    T0.InvntryUom,
    T0.BuyUnitMsr,
    T0.SalUnitMsr,
    T0.AvgPrice,
    T2.WhsCode,
    T4.WhsName,
    T2.OnHand,
    T2.IsCommited,
    T2.OnOrder,
    (T2.OnHand - T2.IsCommited + T2.OnOrder) AS AvailableQty,
    T1.Price AS ListPrice,
    T1.Currency AS ListCurrency
FROM OITM T0
LEFT JOIN ITM1 T1
       ON T1.ItemCode = T0.ItemCode
      AND T1.PriceList = @PriceListNum
LEFT JOIN OITW T2
       ON T2.ItemCode = T0.ItemCode
LEFT JOIN OITB T3
       ON T3.ItmsGrpCod = T0.ItmsGrpCod
LEFT JOIN OWHS T4
       ON T4.WhsCode = T2.WhsCode
WHERE T0.validFor = 'Y'
  AND T0.frozenFor = 'N';
```

### Consulta Service Layer recomendada

```http
GET /b1s/v1/Items?$select=ItemCode,ItemName,ItemsGroupCode,InventoryUOM,PurchaseUnit,SalesUnit,AvgPrice,ItemWarehouseInfoCollection&$expand=ItemWarehouseInfoCollection
```

Si se requiere precio por lista, debe consultarse la entidad/precio disponible en el ambiente o usar SQL/QueryService cuando Service Layer no exponga la forma practica esperada.

## 2.4 Campos tecnicos que SAP probablemente no trae listos

Para que la cotizacion sea exacta, SAP debe tener o permitir mapear:

- Ancho de bobina.
- Gramaje.
- Costo por MSI.
- Costo por kg.
- Costo por metro o pie lineal.
- Familia tecnica: sustrato, tinta, barniz, laminado, empaque, plancha.
- Tipo de proceso compatible: digital, convencional o ambos.
- Moneda base.
- Unidad de compra.
- Unidad de consumo.
- Conversiones.
- Almacen relevante para produccion.

Si esos datos no existen en SAP, se recomienda usar **campos definidos por usuario** (`U_*`) o mantenerlos en tablas locales de la aplicacion.

## 2.5 Tipo de cambio

Si se cotiza en CRC y USD, el sistema debe conocer la fuente oficial:

- SAP: `ORTT`
- Servicio externo oficial.
- Valor manual autorizado por gerencia.

Debe definirse si el tipo de cambio de venta y compra sera:

- El del dia de cotizacion.
- El del cierre comercial.
- El configurado manualmente para la proforma.
- El oficial de SAP.

## 2.6 Documentos transaccionales

El documento original mezclaba **Pedido** y **Orden de Produccion**. En SAP Business One son documentos distintos.

### Pedido de cliente

- Service Layer: `Orders`
- DI-API: `Documents` con objeto de pedido de cliente
- Tablas: `ORDR`, `RDR1`
- Uso: formalizar la venta.

### Orden de produccion

- Service Layer: `ProductionOrders`
- DI-API: `ProductionOrders`
- Tablas: `OWOR`, `WOR1`
- Uso: ejecutar fabricacion y componentes.

### Decision recomendada

El flujo ideal debe ser:

1. Cotizacion interna en la aplicacion.
2. Aprobacion comercial.
3. Creacion de pedido de cliente en SAP o borrador de pedido.
4. Creacion de orden de produccion interna/SAP cuando operaciones confirme.
5. Vinculo entre pedido, orden, producto y linea de cotizacion.

Antes de automatizar, gerencia debe confirmar si se generara:

- Solo pedido de cliente.
- Solo orden de produccion.
- Pedido de cliente y orden de produccion vinculada.
- Borradores para revision en SAP antes de contabilizar.

## 2.7 Produccion en SAP: punto sensible

Una orden de produccion SAP no es simplemente una lista libre de materiales. El objeto `ProductionOrders` requiere un articulo terminado (`ItemNo`) y puede depender de arbol de producto/BOM o componentes manuales segun configuracion.

Para flexografia personalizada se debe decidir:

- Crear un item terminado por producto recurrente.
- Usar items genericos por familia.
- Manejar productos unicos como UDFs y adjuntos.
- Crear BOM/Product Tree por producto.
- Enviar componentes manuales a la orden.
- Mantener la orden productiva detallada en la aplicacion y solo enviar resumen comercial a SAP.

Esta decision es critica porque impacta inventario, costos, contabilidad y trazabilidad.

---

# PARTE 3: Requerimientos a gerencia y equipo SAP

## Decisiones que deben confirmarse

1. **Via de integracion autorizada:** Service Layer, DI-API o ambas.
2. **Permisos:** lectura, escritura, creacion de socios, creacion de pedidos, creacion de ordenes y consultas de inventario.
3. **Socios nuevos:** definir si la aplicacion puede crear prospectos/clientes o si solo SAP los crea manualmente.
4. **Precio de materiales:** confirmar si se usara costo promedio, ultimo costo, lista `ITM1`, UDFs o tabla local.
5. **Lista de precios:** si se usa `ITM1`, indicar el `PriceList` oficial.
6. **Almacenes:** definir que almacenes entran al calculo de disponibilidad.
7. **Tipo de cambio:** fuente oficial y momento de aplicacion.
8. **Documento de cierre:** pedido, orden de produccion, borrador o ambos.
9. **Producto terminado:** estrategia SAP para productos personalizados.
10. **UDFs requeridos:** campos tecnicos que deben crearse en SAP si se quiere centralizar la data.

## Datos minimos solicitados a SAP

- Credenciales y ambiente de pruebas.
- URL Service Layer o host del conector DI-API.
- CompanyDB.
- Usuario tecnico.
- Permisos del usuario.
- Lista de almacenes.
- Lista de precios aplicable, si se usara.
- Campos UDF existentes.
- Mapa de grupos de articulos.
- Impuestos.
- Vendedores.
- Condiciones de pago.
- Monedas y tipo de cambio.

---

# PARTE 4: Consultas finales corregidas

## Socios de negocio

```sql
SELECT
    T0.CardCode,
    T0.CardName,
    T0.CardType,
    T0.Currency,
    T0.LicTradNum,
    T0.Phone1,
    T0.E_Mail,
    T0.CntctPrsn,
    T0.GroupCode,
    T0.ListNum
FROM OCRD T0
WHERE T0.validFor = 'Y'
  AND T0.frozenFor = 'N'
  AND T0.CardType IN ('C', 'L');
```

## Direcciones

```sql
SELECT
    CardCode,
    Address,
    AdresType,
    Street,
    Block,
    City,
    County,
    Country,
    ZipCode
FROM CRD1
WHERE CardCode = @CardCode;
```

## Contactos

```sql
SELECT
    CardCode,
    CntctCode,
    Name,
    FirstName,
    LastName,
    Tel1,
    E_MailL
FROM OCPR
WHERE CardCode = @CardCode;
```

## Materiales con inventario y precio opcional

```sql
SELECT
    T0.ItemCode,
    T0.ItemName,
    T0.ItmsGrpCod,
    T3.ItmsGrpNam,
    T0.InvntryUom,
    T0.BuyUnitMsr,
    T0.SalUnitMsr,
    T0.AvgPrice,
    T2.WhsCode,
    T4.WhsName,
    T2.OnHand,
    T2.IsCommited,
    T2.OnOrder,
    (T2.OnHand - T2.IsCommited + T2.OnOrder) AS AvailableQty,
    T1.Price AS ListPrice,
    T1.Currency AS ListCurrency
FROM OITM T0
LEFT JOIN ITM1 T1
       ON T1.ItemCode = T0.ItemCode
      AND T1.PriceList = @PriceListNum
LEFT JOIN OITW T2
       ON T2.ItemCode = T0.ItemCode
LEFT JOIN OITB T3
       ON T3.ItmsGrpCod = T0.ItmsGrpCod
LEFT JOIN OWHS T4
       ON T4.WhsCode = T2.WhsCode
WHERE T0.validFor = 'Y'
  AND T0.frozenFor = 'N';
```

## Tipo de cambio

```sql
SELECT
    RateDate,
    Currency,
    Rate
FROM ORTT
WHERE RateDate = @RateDate;
```

---

# Conclusion ejecutiva

El proyecto es viable y la aplicacion ya contiene la base funcional necesaria para operar cotizaciones tecnicas, productos recurrentes y trazabilidad hacia produccion. La integracion SAP debe plantearse con precision: SAP sera la fuente oficial de maestros, inventario, documentos y control administrativo; la aplicacion sera el motor tecnico-comercial especializado para flexografia.

La recomendacion principal es no forzar que todo el calculo viva en SAP. SAP debe gobernar codigos, existencias, documentos, contabilidad y trazabilidad oficial. La aplicacion debe gobernar las formulas de produccion, matrices de merma, tiempos, maquinas, acabados y ficha tecnica del producto.

Sobre `ITM1`, la conclusion es clara: debe mantenerse como fuente opcional de precio por lista, no como costo tecnico obligatorio. Si gerencia confirma una lista oficial de costeo, se integra. Si no, el costo debe venir de costo promedio, ultimo costo, UDFs o tabla tecnica local.

La decision mas importante antes de escribir documentos en SAP es definir si el cierre de la venta genera pedido de cliente, orden de produccion, borrador o ambos. Esa decision marcara la arquitectura definitiva de integracion y el nivel de control requerido para inventario y contabilidad.
