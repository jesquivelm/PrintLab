# Migración de Seguridad - Password Hashing

## Resumen

Se implementaron las siguientes mejoras de seguridad en el módulo de autenticación:

### 1. Hashing de contraseñas con bcrypt
- **Algoritmo**: bcrypt con costo 12
- **Alcance**: Nuevos usuarios, cambios de contraseña, actualización de perfil
- **Archivos modificados**: `server.js` (backend principal)

### 2. Columna `must_change_password`
- **Propósito**: Forzar cambio de contraseña en el primer inicio de sesión
- **Comportamiento**: 
  - `TRUE` para nuevos usuarios creados desde la interfaz
  - `TRUE` para usuarios existentes migrados (deben cambiar su contraseña)
  - `FALSE` después de cambiar la contraseña exitosamente vía `/api/auth/change-password`

### 3. Rate Limiting en inicio de sesión
- **Límite**: 5 intentos por cada 30 segundos por IP
- **Middleware**: `express-rate-limit`
- **Endpoint protegido**: `POST /api/auth/login`

### 4. Política de Contraseñas
- Mínimo 10 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial
- Validación tanto en creación como en cambio de contraseña

### 5. Cabeceras de Seguridad (Helmet)
- Content Security Policy deshabilitada (compatibilidad con frontend existente)
- Cross-Origin Embedder Policy deshabilitada
- Cross-Origin Resource Policy deshabilitada
- Resto de cabeceras HTTP seguras activas

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `Aplicacion/server.js` | Código completo con bcrypt, rate limiting, helmet y must_change_password |
| `Aplicacion/package.json` | Dependencias: bcrypt, express-rate-limit, helmet |
| `Aplicacion/sql/001_add_password_security.sql` | Script de migración de base de datos |

## Endpoints Afectados

| Endpoint | Cambio |
|----------|--------|
| `POST /api/auth/login` | Rate limiting, bcrypt.compare(), must_change_password check |
| `POST /api/auth/change-password` | Nuevo endpoint para cambio de contraseña forzado |
| `POST /api/admin-users` | bcrypt.hash(), validación de política, must_change_password=TRUE |
| `PATCH /api/admin-users/:id` | bcrypt.hash() si se cambia contraseña, must_change_password=FALSE |

## Base de Datos

Ejecutar migración:
```sql
\i sql/001_add_password_security.sql
```

Esto agrega la columna `must_change_password` a `admin_users` con valor por defecto `TRUE`.

## Notas

- El usuario de emergencia (ADMIN_EMERGENCY_PASSWORD) no se ve afectado por estos cambios
- Las contraseñas existentes en texto plano serán invalidadas (todos los usuarios deben cambiar su contraseña en el primer inicio de sesión)
- No se utiliza ninguna librería de UI nueva
- No se modificaron módulos de negocio, solo autenticación
