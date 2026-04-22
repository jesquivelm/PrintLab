# Cotizador de Flexografía - Mayaprint

Sistema web para cotización de productos de impresión en flexografía digital y convencional.

## Características

- 🖨️ **Cotización automática** para flexografía digital y convencional
- 👥 **Gestión de clientes** con base de datos integrada
- 📦 **Catálogo de productos** configurable
- 💰 **Cálculo automático** de costos (materiales, colores, acabados)
- 📄 **Generación de PDF** para cotizaciones
- 📊 **Historial de cotizaciones** con seguimiento de estados
- 📱 **Diseño responsive** para dispositivos móviles

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Tailwind CSS
- **Backend**: Node.js, Express.js
- **Base de Datos**: SQLite3
- **PDF Generation**: jsPDF
- **Iconos**: Font Awesome

## Instalación

1. **Clonar o copiar el proyecto** a la carpeta `app`
2. **Instalar dependencias**:
   ```bash
   cd app
   npm install
   ```
3. **Iniciar el servidor**:
   ```bash
   npm start
   ```
   O para desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

4. **Abrir el navegador** en `http://localhost:3000`

## Estructura del Proyecto

```
app/
├── package.json              # Dependencias y scripts
├── server.js                 # Servidor backend y API
├── README.md                 # Documentación
└── public/
    ├── index.html           # Página principal
    ├── css/
    │   └── style.css        # Estilos personalizados
    └── js/
        └── app.js           # Lógica del frontend
```

## Funcionalidades Principales

### 1. Nueva Cotización
- Datos del cliente (nombre, NIT, teléfono, email, dirección)
- Detalles del producto (tipo, cantidad, medidas, colores, material)
- Acabados disponibles (barniz, laminado, troquelado, pegado, plegado)
- Cálculo automático de precios con IVA
- Fechas de entrega y vigencia

### 2. Gestión de Clientes
- Alta y edición de clientes
- Búsqueda rápida
- Historial de cotizaciones por cliente

### 3. Catálogo de Productos
- Configuración de productos base
- Precios según tipo de impresión
- Materiales y especificaciones

### 4. Historial de Cotizaciones
- Listado completo de cotizaciones
- Estados (pendiente, aprobada, rechazada)
- Filtros y búsqueda
- Exportación a PDF

## Cálculo de Costos

El sistema calcula los costos basándose en:

- **Tipo de impresión**: Digital vs Convencional
- **Cantidad**: Precios por volumen
- **Colores**: Costo adicional por color extra
- **Medidas**: Cálculo por área
- **Acabados**: Costos adicionales por cada acabado
- **IVA**: 12% aplicado automáticamente

### Fórmula de Cálculo

```
Precio Unitario = Precio Base × (1 + Costo Colores) × (1 + Costo Medidas) × (1 + Costo Acabados)
Precio Total = Precio Unitario × Cantidad
IVA = Precio Total × 0.12
Total con IVA = Precio Total + IVA
```

## API Endpoints

### Clientes
- `GET /api/clientes` - Obtener todos los clientes
- `POST /api/clientes` - Crear nuevo cliente

### Productos
- `GET /api/productos` - Obtener todos los productos
- `POST /api/productos` - Crear nuevo producto

### Cotizaciones
- `GET /api/cotizaciones` - Obtener todas las cotizaciones
- `POST /api/cotizaciones` - Crear nueva cotización

## Base de Datos

El sistema utiliza SQLite con las siguientes tablas:

- **clientes**: Información de clientes
- **productos**: Catálogo de productos
- **cotizaciones**: Historial de cotizaciones

## Personalización

### Agregar Nuevos Acabados
1. Editar `public/index.html` - agregar checkbox en la sección de acabados
2. Actualizar `public/js/app.js` - agregar el acabado en la función `calcularCotizacion()`
3. Modificar el costo según corresponda

### Modificar Fórmulas de Cálculo
Editar la función `calcularCotizacion()` en `public/js/app.js` para ajustar:
- Precios base
- Factores de cálculo
- Porcentajes de IVA

### Personalizar Diseño
- Modificar `public/css/style.css` para cambios visuales
- Editar `public/index.html` para结构调整

## Desarrollo

### Portabilidad de Base de Datos
- Línea base de reglas: `docs/database-portability.md`
- Estructura objetivo para acceso a datos: `db/repositories/` y `db/adapters/`
- Verificación rápida: `npm run db:portability-check`

### Scripts Disponibles
- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar servidor con nodemon (desarrollo)
- `npm test` - Ejecutar pruebas (pendiente de implementar)
- `npm run db:portability-check` - Verificar que el código nuevo no profundice el acoplamiento a PostgreSQL

### Extensiones Futuras
- [ ] Sistema de autenticación de usuarios
- [ ] Integración con sistemas de pago
- [ ] Notificaciones por email
- [ ] Reportes avanzados
- [ ] API REST completa
- [ ] Migración a base de datos más robusta (PostgreSQL/MySQL)

## Soporte

Para soporte técnico o reportar issues:
1. Revisar la consola del navegador para errores
2. Verificar que el servidor esté corriendo en el puerto 3000
3. Comprobar que las dependencias estén instaladas correctamente

## Licencia

MIT License - Mayaprint 2024
