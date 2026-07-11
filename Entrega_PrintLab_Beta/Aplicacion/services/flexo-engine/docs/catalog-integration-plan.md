# Plan de Integracion de Catalogos

## Objetivo

Conectar el motor de `flexo regular` con los catalogos reales del sistema original sin depender de la carpeta `App`.

## Fuentes detectadas

- `Costos.xlsx`
- `Productos.xlsx`
- `Troqueles.xlsx`
- `Calculo.xlsx`
- `Calculo Flexografia.xml`
- `FLEXO - ORDENES.xml`
- `INVENTARIO - MATERIA PRIMA.xml`

## Catalogos a construir

### Materiales

Entradas esperadas:

- id material
- descripcion
- proceso productivo compatible
- ancho
- gramaje
- costo por MSI
- costo por KG
- costo tinta por MSI si existe override

### Costos de proceso

Entradas esperadas:

- costo hora preprensa
- minutos por cambio
- costo minuto maquina
- factor montaje por estacion
- velocidad pies por minuto
- costos por MSI de barniz y laminado

### Troqueles

Entradas esperadas:

- id troquel
- descripcion
- dimensiones
- dientes
- repeticiones
- costo base

## Estrategia tecnica

1. Definir interfaces TypeScript para cada catalogo.
2. Crear adaptadores de importacion desde Excel y XML.
3. Normalizar nombres y unidades.
4. Resolver llaves unicas para materiales y troqueles.
5. Inyectar catalogos al motor de calculo.

## Prioridad

1. Materiales
2. Costos
3. Troqueles
4. Productos

## Nota

Mientras no se carguen los catalogos reales, el motor puede operar con parametros manuales.
