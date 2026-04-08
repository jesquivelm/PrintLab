# Fusion Inicial ERP

## Estado actual

- Workspace fusionado creado en `E:\Proyecto ERP` usando como base operativa `ERP 1 Calculo`.
- Base PostgreSQL neutral creada: `impresiones_elite_erp`.
- Esquema cargado con 31 tablas para cotizaciones, calculo flexo, socios, materiales, maquinas, troqueles, usuarios y costos.
- Documentacion funcional del proyecto de calculo copiada al workspace en `docs/`.
- Configuracion visual vieja removida para que el servidor regenere defaults neutrales de `Impresiones Elite`.

## Decision tecnica recomendada

- Mantener `ERP 1 Calculo` como base de interfaz, navegacion y modulos visibles.
- Reutilizar de `ERP Impresion` el modelo `cotizacion -> calculo_flexo -> cantidad_calculo_flexo -> procesos` como columna vertebral del calculo.
- Usar PostgreSQL como unica base del proyecto nuevo. El motor local estaba activo, pero no existia una base previa funcional.

## Hallazgos por modulo

### Cotizaciones

La tabla `cotizacion` ya cubre el nucleo util hoy:

- cliente o socio
- vendedor y cotizador
- estado
- fechas
- moneda
- condicion de pago
- tiempo de entrega
- titulo
- flags de envio

Campos fuente detectados en `Registros Cotizaciones Setiembre 2025.xlsx` que todavia faltan o no estan explicitamente modelados:

- tipo de cambio compra y venta
- exoneracion y porcentaje de exoneracion
- firma de vendedor
- encabezados de impresion
- proforma y descripciones extendidas
- cotizacion agencia
- licitacion
- instalacion vehiculos o edificio
- observaciones largas y condiciones generales
- bloqueo de cotizacion

Recomendacion:

- mover primero tipo de cambio, exoneracion, observaciones, condiciones generales y flags comerciales a columnas reales o `jsonb`
- dejar el resto para la segunda pasada

### Calculo flexografia

La tabla `calculo_flexo` ya trae gran parte del flujo necesario:

- proceso productivo
- formato simple o frente-dorso
- medidas
- tintas, pantones, blanco y doble pasada
- tipo de orden
- tipos y cambios
- materiales y troqueles por proceso
- barniz, laminado y estampado
- etiquetado, salida, core y rollos
- costos internos
- comision de agencia
- elemento padre para subcalculos

La tabla `cantidad_calculo_flexo` ya permite guardar escalas o cantidades alternativas con:

- costo material
- preprensa
- montaje
- tiraje
- tintas
- impresion
- troquelado
- barniz
- laminado
- estampado
- rebobinado
- empaque
- cyrel
- subtotal
- impuesto
- total
- precio millar
- precio unitario

Campos fuente detectados en `Registros Calculos Flexografia Setiembre 2025.xlsx` que aun no estan del todo modelados:

- orden referencia 1 y 2
- segmento productivo
- resumenes de solicitud, estado y validacion
- porcentajes diferenciados cliente, vendedor, nuevo y adicional
- total arte y total proyecto
- troqueles asociados por medida
- series extensas de precios 1..35

Recomendacion:

- los precios 1..35 deben vivir como registros en `cantidad_calculo_flexo`, no como columnas nuevas
- los resumenes y validaciones deben salir de calculo o ir a `jsonb`
- falta decidir si orden referencia dual sera columna doble o relacion

### Materiales

La tabla `material` cubre:

- codigo
- nombre
- ancho
- gramaje
- calibre
- costos por MSI, m2 y kg
- compatibilidad digital o convencional
- tipo proforma
- activo

Campos fuente relevantes en `Inventario Materia Prima.xlsx` aun no modelados:

- proveedor
- descripcion con medidas
- descripcion orden
- adhesivo
- bodega
- color
- familia y familia tiraje
- marca y modelo
- direccion de hilo
- unidades disponibles, toneladas, metros lineales y FIFO
- punto de reorden
- id SAP
- precio por metro lineal y precio unitario
- tipo presentacion y unidad de consumo

Recomendacion:

- esenciales hoy: proveedor, descripcion proforma, id SAP, tipo presentacion, unidad de consumo, precio por metro lineal, precio unitario
- accesorios o inventario duro: bodegas, FIFO, stock, reorden

### Maquinas

Las tablas `maquina` y `maquina_capacidad` ya cubren bien el motor de produccion:

- nombre y tipo de maquina
- minutos hombre
- factores de tiraje y preparacion
- macula default
- clasificacion
- proceso y subproceso
- unidad de trabajo
- tiempos de preparacion
- velocidad
- costo hora maquina y operario
- formulas de tiempo y costo

Brecha principal:

- no existe aun importador adaptado a tus archivos actuales del proyecto ERP nuevo
- falta decidir si una misma maquina puede exponer multiples vistas comerciales y multiples procesos inline

### Troqueles

La tabla `troquel` cubre lo minimo:

- codigo
- descripcion
- ancho y largo
- filas
- dientes
- repeticiones
- estado

Campos fuente relevantes en `Inventario Troqueles.xlsx` aun no modelados:

- clasificacion
- codigo cliente
- codigo preprensa
- codigo proveedor
- desarrollo y elongacion
- gap
- tension
- reemplaza a o reemplazado por
- tipo troquel
- uso digital y convencional
- vericut
- vida util y golpes
- observaciones

Recomendacion:

- esenciales hoy: clasificacion, tipo troquel, uso digital, uso convencional, codigo cliente, proveedor, desarrollo, gap, tension, observaciones
- vida util puede esperar si el foco inmediato es cotizar

### Socios de negocio

La tabla `socio` cubre solo el minimo comercial. Los Excel de socios traen bastante mas:

- vendedor asignado
- correos de facturacion
- telefonos
- credito y rango de credito
- manejo de excedentes, adelantos y faltantes
- forma de entrega
- contacto de VB y producto
- pais y provincia por default
- representante legal
- unidad por defecto
- prioridades de cotizacion
- indicadores de calidad

La estructura vieja `business_partners`, `business_partner_contacts` y `business_partner_addresses` tambien existe en la base nueva y puede servir como staging de importacion.

Recomendacion:

- usar `business_partners*` para importar rapido el universo completo de FileMaker
- consolidar despues en `socio` solo los campos transaccionales que realmente use la web

## Campos que no recomiendo migrar como columnas

Estos parecen mejores como calculados, vistas o `jsonb`:

- analisis de campos
- auditorias
- timestamps duplicados
- checks de interfaz
- textos de resumen generados
- series largas de precio 1..35
- contadores o estados temporales de exportacion
- campos usados solo para busqueda o filtros de FileMaker

## Prioridad para hoy

1. Adaptar importadores a los archivos reales de `C:\Users\jesqu\Desktop\Archivos de Proyecto ERP`.
2. Crear tenant ficticio `Impresiones Elite` y usuarios base.
3. Cargar maquinas, materiales, troqueles y socios.
4. Conectar la pantalla principal de cotizaciones a `cotizacion`, `calculo_flexo` y `cantidad_calculo_flexo`.
5. Integrar el motor de calculo de `ERP Impresion` dentro de la UI de `ERP 1 Calculo`.
6. Rehacer la vista previa lateral con un resumen legible por proceso, costo y resultado.

## Riesgos visibles

- El proyecto base aun usa SQLite para varias pantallas; hay que terminar de moverlo a PostgreSQL para que la fusion quede consistente.
- El branding viejo estaba persistido en config; ya se removio del workspace nuevo, pero si se reutiliza algun backup podria reaparecer.
- Los archivos fuente muestran muchos campos derivados de FileMaker. Si se migran todos tal cual, la web se va a inflar y sera mas dificil mantener el calculo.
