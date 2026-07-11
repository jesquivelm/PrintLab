# Portabilidad de Base de Datos

## Objetivo

Este proyecto opera hoy sobre PostgreSQL, pero el codigo nuevo debe evitar profundizar el acoplamiento a un solo motor. La meta inmediata no es soportar SQL Server u Oracle en produccion hoy mismo, sino dejar una base tecnica que haga posible agregar esos motores sin reescribir toda la aplicacion.

## Regla principal

Todo cambio nuevo de base de datos debe pensarse como si, en el futuro, necesitara una implementacion para:

- PostgreSQL
- SQL Server
- Oracle

Si una solucion solo funciona en PostgreSQL, no debe agregarse sin justificarlo y aislarlo.

## Reglas obligatorias para codigo nuevo

### 1. No escribir SQL directo en rutas o controladores

No agregar `pgQuery(...)`, `client.query(...)` ni SQL inline nuevo dentro de rutas HTTP.

En su lugar:

- la ruta valida entradas y arma la respuesta HTTP
- la logica de negocio vive en servicios
- el acceso a datos vive en repositorios

### 2. No crear ni alterar tablas desde `server.js`

El DDL debe vivir en migraciones o scripts versionados, no mezclado con el arranque del servidor.

### 3. No usar features exclusivas de PostgreSQL en codigo nuevo

Evitar en archivos nuevos o consultas nuevas:

- `ILIKE`
- `ON CONFLICT`
- `::jsonb`
- `JSONB`
- `gen_random_uuid()`
- `CREATE TYPE ... ENUM`
- `DO $$`
- `TIMESTAMPTZ` cuando no sea estrictamente necesario

### 4. Generar UUID en Node cuando sea posible

Preferir `crypto.randomUUID()` en la aplicacion en lugar de generar UUID desde SQL.

### 5. Preferir tipos portables

Preferir:

- `VARCHAR` o `TEXT` sobre tipos especiales del motor
- `DATETIME` logico en aplicacion o tipos fecha/hora simples por motor
- catalogos o validacion en aplicacion sobre `ENUM` del motor
- columnas relacionales normales antes que estructuras JSON cuando la informacion se consulta mucho

### 6. Toda consulta nueva debe vivir en un repositorio

Ubicacion esperada:

- `db/repositories/`

Implementaciones futuras por motor:

- `db/adapters/postgres/`
- `db/adapters/sqlserver/`
- `db/adapters/oracle/`

## Estructura objetivo

```text
db/
  adapters/
    postgres/
    sqlserver/
    oracle/
  repositories/
    admin-users-repository.js
    admin-permissions-repository.js
    quotes-repository.js
```

## Contrato recomendado para repositorios

El resto del sistema no deberia saber que motor usa por debajo. Debe depender de funciones neutrales como estas:

```js
await adminUsersRepository.findById(id);
await adminUsersRepository.list(filters);
await adminUsersRepository.create(payload);
await adminUsersRepository.update(id, payload);
```

Lo importante no es el nombre exacto, sino mantener:

- entradas claras
- salidas consistentes
- errores previsibles
- cero SQL mezclado con la capa HTTP

## Estrategia de migracion gradual

### Etapa 1

- No agregar mas SQL directo en rutas nuevas.
- No agregar mas DDL en runtime.
- Mover consultas nuevas a repositorios.

### Etapa 2

- Extraer consultas existentes por dominio.
- Sacar la inicializacion de esquema fuera de `server.js`.
- Reducir gradualmente los patrones Postgres-only.

### Etapa 3

- Crear adapter Postgres formal.
- Definir una interfaz comun para repositorios.
- Agregar luego un adapter SQL Server solo cuando exista entorno de prueba real.

## Regla operativa para futuros cambios

Antes de agregar o editar una consulta:

1. Revisar este documento.
2. Ejecutar `npm run db:portability-check`.
3. Si la consulta exige algo exclusivo de PostgreSQL, aislarla y documentar la razon.

## Lo que hoy sigue siendo legacy

Todavia existe codigo fuertemente acoplado a PostgreSQL en:

- `server.js`
- `db/server.js`
- `inventory-service.js`
- `integrations/`
- `scripts/import-master-data.js`
- `sql/schema.sql`
- `sql/schema_flexo_core.sql`
- `sql/schema_planificacion.sql`

Ese codigo no es el modelo a seguir. Se mantiene como base legacy mientras se refactoriza.
