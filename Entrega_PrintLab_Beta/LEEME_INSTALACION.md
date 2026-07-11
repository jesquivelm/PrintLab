# PrintLab - Guia de Instalacion (BETA)

Sistema web para cotizacion de productos de impresion en flexografia digital y convencional.

---

## Requisitos del Sistema

- **Node.js**: v18.x o superior (recomendado v20.x)
- **PostgreSQL**: v14.x o superior (recomendado v16.x)
- **NPM**: v9.x o superior
- **Sistema Operativo**: Windows Server 2019/2022, Linux (Ubuntu 20.04+) o macOS

---

## Version de Node.js

La aplicacion fue desarrollada y probada con Node.js v24.11.1.
Se recomienda usar Node.js v18 LTS o superior.

Descargar: https://nodejs.org/

---

## Version de PostgreSQL

La aplicacion fue probada con PostgreSQL 18.
Se recomienda PostgreSQL v14 o superior.

Descargar: https://www.postgresql.org/download/

---

## Variables de Entorno Necesarias

Copie el archivo `.env.example` como `.env` dentro de la carpeta `Aplicacion/`:

```bash
# En Windows:
copy .env.example .env

# En Linux/Mac:
cp .env.example .env
```

Edite el archivo `.env` con los valores correctos para su entorno:

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor Express | `3000` |
| `DATABASE_URL` | Cadena de conexion PostgreSQL | `postgresql://usuario:password@localhost:5432/printlab` |
| `PGSSLMODE` | Modo SSL para PostgreSQL | `require` o `disable` |
| `NODE_ENV` | Modo de ejecucion | `production` o `development` |
| `ADMIN_EMERGENCY_PASSWORD` | Contrasena de emergencia para admin | `cambiar_esta_contrasena` |

---

## Instalacion

### 1. Instalar dependencias

Abra una terminal en la carpeta `Aplicacion/` y ejecute:

```bash
npm install
```

### 2. Configurar la base de datos

Ejecute el script de inicializacion para crear las tablas:

```bash
npm run db:init
```

Para cargar los datos maestros (si tiene los archivos Excel de origen):

```bash
npm run db:import
```

Opcion combinada (inicializar + importar):

```bash
npm run db:reset
```

### 3. Iniciar la aplicacion

```bash
npm start
```

La aplicacion estara disponible en: http://localhost:3000

Para desarrollo con recarga automatica:

```bash
npm run dev
```

---

## Como Restaurar la Base de Datos

### Desde el respaldo SQL:

```bash
psql -U usuario -h localhost -d printlab -f "BaseDatos\PrintLab.sql"
```

### Desde el respaldo custom (recomendado):

```bash
pg_restore -U usuario -h localhost -d printlab --no-owner --no-acl "BaseDatos\PrintLab.backup"
```

> **Nota**: Reemplace `usuario`, `localhost` y `printlab` con sus valores reales de conexion.

---

## Como Cambiar el Puerto

Edite la variable `PORT` en el archivo `.env`:

```
PORT=8080
```

Luego reinicie el servidor.

---

## Como Cambiar la Conexion PostgreSQL

Edite la variable `DATABASE_URL` en el archivo `.env`:

```
DATABASE_URL=postgresql://mi_usuario:mi_password@mi_servidor:5432/mi_base_datos?sslmode=require
```

O use variables individuales (descomentandolas en `.env`):

```
DB_HOST=mi_servidor
DB_PORT=5432
DB_NAME=mi_base_datos
DB_USER=mi_usuario
DB_PASSWORD=mi_password
```

---

## Ubicacion de Logs

Los logs de la aplicacion se almacenan en:

```
Aplicacion/logs/
```

Si la carpeta no existe, se crea automaticamente al iniciar el servidor.

---

## Estructura del Proyecto

```
Entrega_PrintLab_Beta/
├── Aplicacion/         # Codigo fuente de la aplicacion
│   ├── config/         # Configuraciones generales
│   ├── db/             # Conexion a base de datos
│   ├── public/         # Archivos estaticos (HTML, CSS, JS frontend)
│   ├── scripts/        # Scripts de utilidad
│   ├── services/       # Servicios de backend
│   ├── sql/            # Esquemas SQL
│   ├── storage/        # Archivos subidos por usuarios
│   ├── .env            # Variables de entorno (configurar)
│   ├── server.js       # Servidor Express (ofuscado)
│   └── package.json    # Dependencias del proyecto
├── BaseDatos/          # Respaldos de base de datos
│   ├── PrintLab.sql    # Respaldo en formato SQL
│   └── PrintLab.backup # Respaldo en formato comprimido
├── Documentacion/      # Documentacion tecnica
├── Verificacion/       # Resultados de validacion
├── Revisar/            # Archivos pendientes de revision
├── .env.example        # Plantilla de variables de entorno
├── LEEME_INSTALACION.md # Este archivo
└── VERSION.txt         # Informacion de version
```

---

## Problemas Comunes

### Error: Puerto en uso

Si el puerto 3000 ya esta ocupado, cambie el puerto en `.env` o termine el proceso que lo usa:

```bash
# Encontrar proceso usando el puerto 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: No se puede conectar a PostgreSQL

1. Verifique que PostgreSQL este instalado y corriendo
2. Verifique que las credenciales en `.env` sean correctas
3. Verifique que el servidor PostgreSQL permita conexiones remotas (si aplica)
4. Pruebe la conexion manualmente:
   ```bash
   psql -U su_usuario -h localhost -d printlab
   ```

### Error: npm install falla

1. Verifique que Node.js este correctamente instalado
2. Limpie el cache de npm:
   ```bash
   npm cache clean --force
   ```
3. Elimine `node_modules` y `package-lock.json`, luego reintente:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Error: La base de datos no tiene tablas

Ejecute la inicializacion:

```bash
npm run db:init
```

### Error: Archivos estaticos no se cargan

Verifique que la carpeta `public/` exista y contenga los archivos HTML/CSS/JS.
El servidor Express sirve archivos estaticos desde `public/` automaticamente.

### Error: La ofuscacion impide leer errores

Los archivos backend han sido ofuscados. Si necesita depurar, consulte los backups originales en la carpeta `Revisar/obfuscated-backup/`.

---

## Soporte

Para reportar problemas, contacte al equipo de desarrollo.

---

&copy; 2026 PrintLab - Version de Entrega BETA
