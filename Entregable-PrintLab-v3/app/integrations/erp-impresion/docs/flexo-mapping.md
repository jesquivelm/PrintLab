# Mapeo Inicial Flexografia

## Objetivo

Traducir el cotizador existente de FileMaker a una aplicacion web, conservando el comportamiento funcional del modulo de flexografia.

## Unidades funcionales identificadas

- Cotizacion
- Linea de cotizacion
- Calculo
- Subcalculo / Elemento
- Variante frente / dorso
- Material
- Troquel
- Adicional
- Proforma / salida de impresion

## Formatos detectados

- `Regular`
  - Equivalente funcional observado: `Simple`
  - Usa un solo calculo principal
  - No requiere elemento 2
- `Frente-Dorso`
  - Usa elemento 1 para frente y elemento 2 para dorso
  - Duplica varias validaciones y relaciones de producto/material
- `Licitacion`
  - Debe tratarse despues del regular

## Entradas clave del calculo

- Proceso productivo
  - Convencional
  - Digital
  - Hibrido
- Tipo de producto
- Cantidad
- Dimensiones
- Ancho de rollo
- Material seleccionado
- Cantidad de tintas
- Pantones
- Tinta blanca
- Doble pasada
- Cantidad de cambios o tipos
- Troquel
- Laminado
- Barniz
- Arte
- Cyrel
- Maquila
- Flete
- Empaque
- Porcentajes comerciales
- IVA

## Bloques de costo detectados en FileMaker

- Material
- Preprensa
- Montaje de maquina
- Tintas
- Tiraje
- Acabados
- Laminado
- Barniz
- Troquelado
- Empaque
- Adicionales

## Relaciones a revisar en siguientes iteraciones

- Calculo principal vs calculo por elementos
- Frente / dorso
- Material flexo convencional vs digital
- Troqueles convencionales vs digitales
- Licitacion vs regular
- Proforma por precio unitario, por millar y totalizada

## Decisiones actuales

- No usar la carpeta `App` del proyecto original.
- Trabajar en un workspace aparte.
- Iniciar solo con flexografia y luego expandir.
- El primer dominio a construir es `Flexo Regular`.

## Reglas detectadas para regular

Del XML se observan validaciones que aplican cuando `FORMATO COTIZACION <> "Frente-Dorso"`.

Campos recurrentes para el flujo regular:

- cantidad de productos
- tipo orden
- orden de referencia cuando es repeticion o repeticion con cambio
- material segun proceso productivo
- cantidad de tintas o sin impresion
- ancho y largo de etiqueta
- tipo producto
- tipo etiquetado
- tipo de salida de rollo si el etiquetado es automatico
- porcentaje de rendimiento bruto valido
- material enlazado al inventario

## Trazas relevantes encontradas

- `FORMATO COTIZACION` se calcula como `Simple` si no existe elemento 2.
- `TIPO ORDEN` influye en validaciones y tiempos base.
- Se detectan campos de etiquetado regular:
  - `ETIQUETADO | ETIQUETAS REGULARES | CANTIDAD X ROLLO`
  - `ETIQUETADO | ETIQUETAS REGULARES | CANTIDAD ROLLOS`
