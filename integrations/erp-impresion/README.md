# Mayaprint Flexo Web

Migracion del cotizador de Mayaprint a una implementacion web, iniciando por el modulo de cotizaciones de flexografia.

## Alcance inicial

- Migrar primero el flujo de cotizacion de flexografia.
- Soportar calculos principales y subcalculos:
  - calculo base
  - elementos
  - frente / dorso
- Ignorar la carpeta `App` del proyecto original porque esta siendo trabajada por separado.
- El primer flujo a clonar es `regular`, que en la estructura original se comporta como `simple`.

## Fuente funcional

Carpeta origen:

`C:\Users\jesquiv\Desktop\Proyecto Mayaprint WEB`

Archivos a tomar como referencia funcional fuera de `App`:

- `Calculo Flexografia.pdf`
- `Calculo Flexografia Regular.pdf`
- `Calculo Flexografia Licitacion.pdf`
- `Campos Calculos Flexo.pdf`
- `Campos Cotizaciones.pdf`
- `Formulario Cotizacion.pdf`
- `Orden Flexografia Regular.pdf`
- `Orden Flexografia Frente-Dorso.pdf`
- `Parametros de Cotizacion.pdf`
- `Parametros Adicionales Cotizacion.pdf`
- `Calculo Flexografia.xml`
- `COTIZACIONES.xml`
- `FLEXO - ORDENES.xml`
- `INVENTARIO - MATERIA PRIMA.xml`
- `Calculo.xlsx`
- `Costos.xlsx`
- `Productos.xlsx`
- `Troqueles.xlsx`
- `Proforma.xlsx`

## Hallazgos iniciales

Del XML de FileMaker ya se localizaron conceptos clave para flexografia:

- proceso productivo: convencional / digital / hibrido
- cantidad de productos
- tipo producto
- materiales de flexo convencional y digital
- tintas, pantones, blanco y doble pasada
- preprensa
- montaje de maquina
- tiraje
- costo de material
- laminado
- barniz
- troquel
- arte
- cyrel
- maquila
- flete
- empaque
- porcentajes comerciales e impuestos

Tambien se detecto que la estructura original maneja:

- lineas de cotizacion
- calculos por elemento
- variantes frente / dorso
- adicionales asociados a la linea
- relacion con troqueles, materiales y ordenes de flexografia

## Decisiones de modelado

- `regular` sera el caso base del cotizador web.
- `regular` equivale al formato simple de una sola cara o un solo calculo principal.
- `frente-dorso` se modelara despues como una extension del regular con dos elementos.
- `licitacion` se agregara despues de estabilizar el flujo regular.

## Estrategia

1. Reconstruir el modelo de datos minimo del cotizador de flexografia.
2. Migrar la logica del calculo principal.
3. Agregar soporte a elementos y frente / dorso.
4. Validar contra cotizaciones reales.
5. Afinar diferencias con el sistema original.

## Nota operativa

Este workspace es independiente del folder `App` original para evitar conflictos con trabajo en curso.

## Ejecutar localmente

1. Instala Node.js LTS si aun no lo tienes.
2. Abre una terminal en:
   `C:\Users\jesquiv\Documents\New project\mayaprint-flexo-web`
3. Instala dependencias:
   `npm install`
4. Copia los ejemplos de `data` y renombrarlos quitando `.example`:
   - `data/catalogs/costs.example.json` -> `data/catalogs/costs.json`
   - `data/catalogs/materials.example.json` -> `data/catalogs/materials.json`
   - `data/catalogs/troqueles.example.json` -> `data/catalogs/troqueles.json`
   - `data/catalogs/products.example.json` -> `data/catalogs/products.json`
   - `data/samples/flexo-regular-input.example.json` -> `data/samples/flexo-regular-input.json`
5. Edita esos archivos con tus datos reales.
6. Ejecuta validacion de tipos:
   `npm run check`
7. Inicia la aplicacion local:
   `npm start`
8. Abre tu navegador y entra a:
   `http://localhost:3000`

Si quieres ver el resultado solo en consola, tambien existe:

`npm run demo`
