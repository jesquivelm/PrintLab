# Plan: Centro de Capacitación — Manual de Ayuda al Usuario

## 1. Objetivo

Crear un centro de ayuda dentro de PrintLab donde los usuarios puedan consultar manuales escritos en lenguaje sencillo (explicado como para un niño de tercer grado), con texto, imágenes capturadas y videos demostrativos cortos. Todo vive en la base de datos y se visualiza directamente en el sitio.

---

## 2. Alcance — Módulos a cubrir

### 2.1 Contenido inicial (esta fase)

| # | Módulo | Contenido principal |
|---|--------|---------------------|
| 1 | **Inicio de Sesión** | Qué es, cómo entrar, usuario y contraseña, PIN, qué pasa si olvido la contraseña, cerrar sesión |
| 2 | **Socios** | Qué es un socio, ver lista, crear nuevo (wizard paso a paso), editar, eliminar, contactos, direcciones, conexión con SAP (qué se trae, qué se envía, cuándo), estado del socio, potencial comercial |
| 3 | **SKU (Productos)** | Qué es un SKU, ver lista, crear producto, editar, relación con materiales y máquinas |
| 4 | **Cotizaciones** | Qué es una cotización, crear, editar, líneas, estados, aprobar, enviar a cliente |
| 5 | **Costos** | Configuración general, tipos de producto, convencional, digital, acabados, turnos, tipo de cambio |
| 6 | **Órdenes de Producción** | Qué es una orden, crear, estados, estaciones de trabajo, seguimiento |
| 7 | **Producción** | Vista de producción, ejecución, parámetros por estación |
| 8 | **Calidad** | Dashboard, órdenes de calidad, incidencias, certificados, fichas técnicas |
| 9 | **Tintas** | Catálogo, recetas, pantones, lotes, color similares, calculadora |
| 10 | **Planificación** | Seguimiento, Gantt, capacidad, recursos, preturno, producciones suspendidas |
| 11 | **Facturación FEL** | Dashboard, crear factura, facturas, reportería, configuración |
| 12 | **Reportería** | KPIs, rentabilidad, materia prima |
| 13 | **Inventarios** | Materia prima, troqueles, sellos, cilindros, anilox, producto terminado |
| 14 | **Notificaciones** | Centro de notificaciones, cómo funcionan |
| 15 | **Configuración** | Solo lo esencial:-branding general, SAP (conexión), seguridad/usuarios. NO: iconos, colores de tabs, botones flotantes, imágenes del repositorio |

### 2.2 Contenido excluido (explicitamente NO se documenta)

- Configuración de iconos
- Imágenes del repositorio / branding visual avanzado
- Colores de tabs y botones flotantes
- Configuración de diseño/gráficos
- Parámetros avanzados de BD
- Scripts de migración
- Configuración de licenciamiento

---

## 3. Arquitectura técnica

### 3.1 Base de datos — Nuevas tablas

```sql
-- Categorías/módulos del manual (ej: "Socios", "Cotizaciones", etc.)
CREATE TABLE IF NOT EXISTS capacitacion_categorias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    icono TEXT,           -- clase CSS o nombre de ícono
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artículos/secciones del manual
CREATE TABLE IF NOT EXISTS capacitacion_articulos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES capacitacion_categorias(id),
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    contenido TEXT,       -- HTML enriquecido (texto + imágenes inline)
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imágenes del manual (archivos subidos)
CREATE TABLE IF NOT EXISTS capacitacion_imagenes (
    id SERIAL PRIMARY KEY,
    articulo_id INTEGER REFERENCES capacitacion_articulos(id),
    archivo TEXT NOT NULL,       -- nombre del archivo en disco
    ruta TEXT NOT NULL,          -- ruta relativa de acceso
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos del manual (archivos subidos)
CREATE TABLE IF NOT EXISTS capacitacion_videos (
    id SERIAL PRIMARY KEY,
    articulo_id INTEGER REFERENCES capacitacion_articulos(id),
    archivo TEXT NOT NULL,       -- nombre del archivo en disco
    ruta TEXT NOT NULL,          -- ruta relativa de acceso
    titulo TEXT,
    descripcion TEXT,
    duracion_segundos INTEGER,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice/Tabla de contenidos (para navegación rápida)
CREATE TABLE IF NOT EXISTS capacitacion_indice (
    id SERIAL PRIMARY KEY,
    articulo_id INTEGER REFERENCES capacitacion_articulos(id),
    nivel INTEGER DEFAULT 1,     -- 1=principal, 2=subsección, 3=sub-sub
    anchor TEXT,                 -- id del elemento en el HTML para scroll
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Almacenamiento de archivos

```
public/
  capacitacion/
    imagenes/
      socios/
      cotizaciones/
      ...
    videos/
      socios/
      cotizaciones/
      ...
```

Los archivos estáticos se sirven directamente desde `public/capacitacion/`.

### 3.3 Páginas HTML

| Archivo | Función |
|---------|---------|
| `public/capacitacion.html` | Página principal del centro de capacitación |
| `public/capacitacion-articulo.html` | Vista de un artículo individual |

### 3.4 Archivos JS/CSS

| Archivo | Función |
|---------|---------|
| `public/capacitacion.js` | Lógica del listado/índice del centro |
| `public/capacitacion-articulo.js` | Lógica de vista de artículo |
| `public/capacitacion.css` | Estilos del centro de capacitación |
| `public/capacitacion-admin.js` | Panel administrativo para gestionar contenido (CRUD) |

### 3.5 API Endpoints

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/api/capacitacion/categorias` | Listar categorías activas |
| GET | `/api/capacitacion/articulos` | Listar artículos (filtro por categoría) |
| GET | `/api/capacitacion/articulos/:id` | Obtener un artículo con su contenido |
| POST | `/api/capacitacion/articulos` | Crear artículo (admin) |
| PUT | `/api/capacitacion/articulos/:id` | Actualizar artículo (admin) |
| DELETE | `/api/capacitacion/articulos/:id` | Eliminar artículo (admin) |
| POST | `/api/capacitacion/imagenes` | Subir imagen |
| POST | `/api/capacitacion/videos` | Subir video |
| GET | `/api/capacitacion/indice` | Obtener tabla de contenidos completa |

### 3.6 Rutas de página (en server.js)

```
/capacitacion        → public/capacitacion.html
/capacitacion/:id    → public/capacitacion-articulo.html
```

---

## 4. Estructura de contenido por módulo

### 4.1 Inicio de Sesión (2 artículos)

**Artículo 1: "¿Cómo entro a PrintLab?"**
- Qué es PrintLab (un programa para trabajar en la empresa)
- Abrir el navegador (Chrome) y escribir la dirección
- Pantalla de inicio: qué se ve
- Campo de usuario: escribir el nombre que le dieron
- Campo de contraseña: la contraseña secreta
- Botón "Entrar": qué pasa cuando lo presionas
- Si sale error: qué significa "usuario o contraseña incorrectos"
- PIN alternativo: si tu empresa usa PIN de 4 dígitos

**Artículo 2: "¿Cómo cierro sesión?"**
- Botón de usuario arriba a la derecha
- "Cerrar sesión": qué pasa
- Por qué es importante cerrar sesión si te vas
- Sesión automática: si el sistema te cierra solo (4 horas sin usar)

### 4.2 Socios (6 artículos)

**Artículo 1: "¿Qué es un Socio?"**
- Explicación simple: un socio es un cliente o proveedor
- Tipos: Empresa o Persona individual
- Código de socio: cómo se genera (CL00001, CL00002...)
- Estados: Prospecto, Pendiente de aprobación, Aprobado, Error con SAP

**Artículo 2: "¿Cómo veo la lista de Socios?"**
- Botón "Socios" en el inicio
- La tabla: qué significa cada columna (Código, Nombre, Vendedor, Correo, Sector, Creación, Estado)
- Buscar: escribir nombre, código o correo
- Ordenar: hacer clic en una columna
- Paginación: cargar más

**Artículo 3: "¿Cómo creo un nuevo Socio?"**
- Botón "Nuevo" (arriba a la izquierda)
- Wizard paso a paso:
  - Paso 1: Identificación (tipo de socio, tipo de ID, número de ID, nombre)
  - Paso 2: Contacto principal (nombre, apellido, celular, teléfono, correo, cargo)
  - Paso 3: Dirección (país, departamento, municipio, zona, detalle)
  - Paso 4: Moneda y condiciones comerciales (moneda, días de crédito, exento)
  - Paso 5: Potencial comercial (estimación de ventas)
  - Paso 6: Revisión y guardado
- Detección de duplicados: qué pasa si el ID ya existe

**Artículo 4: "¿Cómo edito un Socio?"**
- Hacer clic en un socio de la lista
- Pestaña "Datos del Cliente": qué se puede cambiar
- Pestaña "Manejo y Entrega": opciones de entrega
- Pestaña "Información SAP": datos que vienen de SAP
- Botón guardar cambios

**Artículo 5: "SAP y los Socios — ¿Qué se conecta?"**
- Explicación simple de qué es SAP (el sistema grande donde la empresa guarda todo)
- Información que se TRAE de SAP:
  - Datos del cliente (nombre, dirección, teléfono, correo)
  - Contactos
  - Direcciones
  - Grupo de vendedor
  - Moneda y condiciones de pago
- Información que se ENVÍA a SAP:
  - Cuando creas un socio nuevo y lo apruebas, se envía a SAP
  - El código que SAP le asigna (CardCode)
- Cuándo ocurre la sincronización:
  - Botón "Actualizar desde SAP": trae todo de SAP
  - Crear socio → Aprobar → Se envía a SAP
  - Botón "Pendientes de SAP": ver quién falta por enviar
- Diagrama simple de flujo

**Artículo 6: "Contactos y Direcciones de un Socio"**
- Agregar un contacto: campos obligatorios y opcionales
- Editar contacto
- Eliminar contacto
- Agregar dirección
- Tipos de dirección (entrega, facturación)
- Mapa de ubicación

### 4.3 SKU / Productos (3 artículos)

**Artículo 1: "¿Qué es un SKU?"**
- Explicación: un SKU es un código único para cada producto que vendemos
- Ejemplos sencillos
- Por qué es importante tenerlo bien registrado

**Artículo 2: "¿Cómo veo y busco productos?"**
- Lista de productos
- Búsqueda y filtros
- Columnas de la tabla

**Artículo 3: "¿Cómo creo un producto?"**
- Botón "Nuevo"
- Campos: nombre, código, descripción, máquinas, materiales
- Relación con costos

### 4.4 Cotizaciones (4 artículos)

**Artículo 1: "¿Qué es una Cotización?"**
- Explicación: es el precio que le damos al cliente por su pedido
- Estados de una cotización
- Flujo básico

**Artículo 2: "¿Cómo creo una Cotización?"**
- Seleccionar socio
- Agregar líneas (productos)
- Cantidades y especificaciones
- El sistema calcula el precio

**Artículo 3: "¿Cómo envío la Cotización?"**
- Generar proforma (PDF)
- Enviar por correo
- Estados de envío

**Artículo 4: "¿Cómo apruebo una Cotización?"**
- Quién puede aprobar
- El botón de aprobar
- Qué pasa después (se convierte en orden)

### 4.5 Costos (3 artículos)

**Artículo 1: "¿Qué es la configuración de Costos?"**
- Para qué sirve
- Relación con las cotizaciones

**Artículo 2: "Configuración General y Tipos de Producto"**
- Costos por máquina
- Materiales y sus precios
- Tipos de producto

**Artículo 3: "Acabados, Turnos y Tipo de Cambio"**
- barniz, laminado, troquelado
- Turnos de trabajo
- Tipo de cambio para moneda extranjera

### 4.6 Órdenes de Producción (3 artículos)

**Artículo 1: "¿Qué es una Orden de Producción?"**
- De cotización a orden
- Qué contiene la orden
- Estados

**Artículo 2: "¿Cómo creo y gestiono Órdenes?"**
- Crear desde cotización
- Asignar máquinas
- Estaciones de trabajo

**Artículo 3: "Seguimiento de Órdenes"**
- Ver progreso
- Cambiar estados
- Marcar como completada

### 4.7 Producción (2 artículos)

**Artículo 1: "¿Qué es Producción?"**
- Diferencia entre orden y producción
- Vista general

**Artículo 2: "¿Cómo registro datos en Producción?"**
- Parámetros por estación
- Temperatura, viscosidad, etc.
- Captura de datos del operador

### 4.8 Calidad (3 artículos)

**Artículo 1: "¿Qué es Calidad en PrintLab?"**
- Propósito del módulo
- Qué se controla

**Artículo 2: "Órdenes de Calidad e Incidencias"
- Crear incidencia
- Tipos de incidencia
- Seguimiento

**Artículo 3: "Certificados y Fichas Técnicas"**
- Generar certificado
- Ficha técnica de impresión
- Cartilla de color

### 4.9 Tintas (3 artículos)

**Artículo 1: "¿Qué es el módulo de Tintas?"**
- Catálogo de tintas
- Recetas
- Pantones

**Artículo 2: "Lotes y Color Similares"
- Gestionar lotes
- Buscar colores similares

**Artículo 3: "Calculadora de Tintas"**
- Cómo usar la calculadora
- Consumo estimado

### 4.10 Planificación (3 artículos)

**Artículo 1: "¿Qué es Planificación?"**
- Por qué planificar
- Herramientas disponibles

**Artículo 2: "Seguimiento y Gantt"**
- Diagrama de Gantt
- Línea de tiempo
- Producciones suspendidas

**Artículo 3: "Capacidad y Recursos"**
- Capacidad de máquinas
- Asignación de recursos
- Preturno

### 4.11 Facturación FEL (2 artículos)

**Artículo 1: "¿Qué es Facturación FEL?"**
- Facturación electrónica (Guatemala)
- Requisitos

**Artículo 2: "¿Cómo creo una Factura?"**
- Seleccionar orden/cotización
- Datos fiscales
- Enviar y consultar

### 4.12 Reportería (2 artículos)

**Artículo 1: "¿Qué puedo ver en Reportería?"**
- KPIs principales
- Rentabilidad
- Materia prima

**Artículo 2: "Cómo leer los reportes"**
- Interpretar gráficas
- Números importantes

### 4.13 Inventarios (3 artículos)

**Artículo 1: "¿Qué hay en Inventarios?"**
- Tipos de inventario
- Materia prima, troqueles, etc.

**Artículo 2: "Troqueles, Sellos y Cilindros"**
- Qué son
- Cómo gestionarlos

**Artículo 3: "Producto Terminado"**
- Inventario final
- Consulta

### 4.14 Notificaciones (1 artículo)

**Artículo 1: "¿Cómo funcionan las Notificaciones?"**
- Centro de notificaciones
- Tipos de notificación
- Marcar como leído

### 4.15 Configuración (2 artículos)

**Artículo 1: "Configuración General — Lo básico"**
- Branding (nombre de empresa, logo)
- Moneda por defecto
- Solo lo esencial

**Artículo 2: "Conexión con SAP"**
- Configuración de SAP (Service Layer o DI-API)
- Credenciales
- Probar conexión
- Qué tablas se sincronizan

---

## 5. Diseño de la interfaz

### 5.1 Página principal (`capacitacion.html`)

```
┌──────────────────────────────────────────────────────┐
│  PrintLab  ·  Centro de Capacitación                 │
├──────────────────────────────────────────────────────┤
│  [Buscador de artículos]                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │ Inicio  │  │ Socios  │  │  SKU    │              │
│  │ Sesión  │  │         │  │         │              │
│  │  🔑     │  │  👥     │  │  📦     │              │
│  └─────────┘  └─────────┘  └─────────┘              │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │Cotizar  │  │ Costos  │  │Órdenes  │              │
│  │         │  │         │  │         │              │
│  │  📝     │  │  💰     │  │  🏭     │              │
│  └─────────┘  └─────────┘  └─────────┘              │
│                                                      │
│  ... más módulos ...                                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5.2 Página de artículo (`capacitacion-articulo.html`)

```
┌──────────────────────────────────────────────────────┐
│  ← Volver  |  Centro de Capacitación                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Nombre del Módulo                                   │
│  Título del Artículo                                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Contenido del artículo (HTML enriquecido)   │    │
│  │                                              │    │
│  │  Texto explicativo en lenguaje sencillo...   │    │
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐    │    │
│  │  │  [Imagen: screenshot del paso]       │    │    │
│  │  │  Descripción de la imagen            │    │    │
│  │  └──────────────────────────────────────┘    │    │
│  │                                              │    │
│  │  Más texto explicativo...                    │    │
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐    │    │
│  │  │  ▶ Video: Nombre del video           │    │    │
│  │  │  (reproductor de video embebido)     │    │    │
│  │  └──────────────────────────────────────┘    │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Artículo anterior  |  Siguiente artículo →          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5.3 Panel de administración (dentro del centro)

- Botón "Administrar" visible solo para usuarios con permisos
- CRUD de categorías
- CRUD de artículos (editor HTML simple)
- Subir imágenes (drag & drop o botón)
- Subir videos (botón, max 50MB)
- Reordenar artículos con drag & drop

---

## 6. Flujo de datos

### 6.1 Crear contenido (administrador)

1. Admin entra al Centro de Capacitación
2. Clic en "Administrar"
3. Selecciona categoría (ej: "Socios")
4. Crea artículo con título y contenido
5. Sube imágenes y/o videos
6. Guarda
7. El artículo queda visible para todos los usuarios

### 6.2 Consultar contenido (usuario)

1. Usuario entra al Centro de Capacitación (botón en dashboard o menú)
2. Ve el índice con todas las categorías
3. Busca o selecciona una categoría
4. Lee el artículo
5. Ve imágenes y reproduce videos
6. Navega entre artículos con anterior/siguiente

---

## 7. Videos

### 7.1 Especificaciones

- Formato: MP4 (H.264)
- Resolución máxima: 720p
- Duración: 30 segundos a 3 minutos por video
- Tamaño máximo por archivo: 50 MB
- Ubicación: `public/capacitacion/videos/{modulo}/`

### 7.2 Videos planificados (fase inicial)

| Módulo | Video | Descripción |
|--------|-------|-------------|
| Inicio | `login-completo.mp4` | Cómo entrar a PrintLab paso a paso |
| Socios | `crear-socio.mp4` | Crear un nuevo socio desde cero |
| Socios | `sap-sincronizar.mp4` | Cómo se sincroniza con SAP |
| Cotizaciones | `crear-cotizacion.mp4` | Crear una cotización básica |
| Produccion | `produccion-estaciones.mp4` | Configurar estaciones de trabajo |

---

## 8. Imágenes

### 8.1 Especificaciones

- Formato: PNG o JPG
- Resolución máxima: 1200px de ancho
- Tamaño máximo por archivo: 2 MB
- Ubicación: `public/capacitacion/imagenes/{modulo}/`

### 8.2 Tipos de imagen

- Screenshots de la aplicación (botones, formularios, tablas)
- Diagramas de flujo simples (creados con herramientas CSS/HTML)
- Iconos decorativos

---

## 9. Servidor de archivos estáticos

Express ya sirve `public/` como estático. Los archivos en `public/capacitacion/` serán accesibles directamente vía URL:
- `http://localhost:3000/capacitacion/imagenes/socios/boton-nuevo.png`
- `http://localhost:3000/capacitacion/videos/socios/crear-socio.mp4`

---

## 10. Dependencias nuevas

Ninguna. Se usa lo que ya existe:
- `pg` (PostgreSQL) — ya instalado
- `multer` — ya instalado (para subir archivos)
- Express estático — ya configurado

---

## 11. Archivos a crear/modificar

### 11.1 Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `public/capacitacion.html` | Página principal del centro |
| `public/capacitacion-articulo.html` | Página de artículo individual |
| `public/capacitacion.css` | Estilos del centro |
| `public/capacitacion.js` | Lógica del listado/índice |
| `public/capacitacion-articulo.js` | Lógica de artículo |
| `public/capacitacion-admin.js` | Panel de administración |
| `sql/migration-centro-capacitacion.sql` | Migración de tablas |

### 11.2 Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `server.js` | Agregar rutas de página (`/capacitacion`, `/capacitacion/:id`) y API (`/api/capacitacion/*`) |
| `public/dashboard.html` | Agregar tarjeta de "Centro de Capacitación" en el grid del dashboard |
| `public/dashboard.js` | Agregar evento click para la nueva tarjeta |

---

## 12. Orden de implementación

1. **Migración SQL** — Crear tablas en la BD
2. **API en server.js** — Endpoints CRUD para categorías, artículos, imágenes, videos
3. **Página principal** — `capacitacion.html` + `capacitacion.css` + `capacitacion.js`
4. **Página de artículo** — `capacitacion-articulo.html` + `capacitacion-articulo.js`
5. **Panel admin** — `capacitacion-admin.js` (CRUD desde el navegador)
6. **Dashboard** — Agregar tarjeta de acceso
7. **Contenido inicial** — Insertar categorías y artículos base en la BD
8. **Capturas de pantalla** — Tomar screenshots de cada módulo para las imágenes iniciales

---

## 13. Contenido inicial a insertar (mínimo viable)

### Categorías

1. Inicio de Sesión (orden: 1)
2. Socios (orden: 2)
3. SKU / Productos (orden: 3)
4. Cotizaciones (orden: 4)
5. Costos (orden: 5)
6. Órdenes de Producción (orden: 6)
7. Producción (orden: 7)
8. Calidad (orden: 8)
9. Tintas (orden: 9)
10. Planificación (orden: 10)
11. Facturación FEL (orden: 11)
12. Reportería (orden: 12)
13. Inventarios (orden: 13)
14. Notificaciones (orden: 14)
15. Configuración (orden: 15)

### Artículos iniciales (mínimos por módulo)

- Inicio de Sesión: 2 artículos
- Socios: 6 artículos
- SKU: 3 artículos
- Cotizaciones: 4 artículos
- Costos: 3 artículos
- Órdenes: 3 artículos
- Producción: 2 artículos
- Calidad: 3 artículos
- Tintas: 3 artículos
- Planificación: 3 artículos
- Facturación: 2 artículos
- Reportería: 2 artículos
- Inventarios: 3 artículos
- Notificaciones: 1 artículo
- Configuración: 2 artículos

**Total: ~45 artículos iniciales**
