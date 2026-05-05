# Especificacion Inicial: Flexografia Regular

## Resumen

El flujo regular sera la primera version web del cotizador.
En el sistema original este comportamiento corresponde al formato `Simple`.

## Estructura funcional

- Una cotizacion puede contener una o varias lineas.
- Cada linea regular tiene un calculo principal.
- Ese calculo principal puede tener cantidades alternativas o escalas.
- No usa elemento 2 ni separacion frente/dorso.

## Datos minimos de entrada

- cliente
- nombre del trabajo
- proceso productivo
- tipo orden
- tipo producto
- cantidad productos
- ancho
- largo
- material
- tipo etiquetado
- tipo salida del rollo cuando aplique
- configuracion de tintas
- acabados y adicionales

## Validaciones minimas

- Debe existir cantidad de productos.
- Debe existir tipo orden.
- Si tipo orden es `Repeticion` o `Repeticion con Cambio`, debe existir orden de referencia.
- Debe existir material valido.
- Si `Sin impresion` no esta activo, debe existir cantidad de tintas.
- Deben existir ancho y largo.
- Debe existir tipo producto.
- Debe existir tipo etiquetado.
- Si tipo etiquetado es `Automatico`, debe existir tipo de salida.
- El rendimiento bruto no puede ser menor o igual a cero cuando haya cantidades.

## Bloques de calculo

- Material
- Preprensa
- Montaje
- Tintas
- Tiraje
- Laminado
- Barniz
- Troquel
- Arte
- Cyrel
- Maquila
- Flete
- Empaque
- Imprevistos
- Financieros
- Utilidad
- Comisiones
- IVA

## Salidas requeridas

- desglose de costos
- precio unitario sin IVA
- subtotal antes de IVA
- IVA
- total
- datos para proforma
- datos para orden de produccion futura

## Formula base adoptada en esta fase

Para la primera migracion web del flujo regular se adopta esta secuencia, alineada con lo observado en el XML:

1. subtotal costos sin impuestos
2. subtotal costos mas imprevistos
3. subtotal costos mas imprevistos y financieros
4. subtotal con rendimiento bruto
5. subtotal antes de IVA
6. IVA
7. total
8. unitario sin IVA
