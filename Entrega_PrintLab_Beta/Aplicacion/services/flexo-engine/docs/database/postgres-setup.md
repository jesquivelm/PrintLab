# PostgreSQL Local

Esta es la ruta recomendada para arrancar la base local de `Mayaprint Flexo Web` en Windows usando PostgreSQL.

## 1. Instalar PostgreSQL

Si ya tienes el instalador, Usalo con estas recomendaciones:

- Version: `PostgreSQL 15` o `16`
- Puerto: `5432`
- Usuario administrador: `postgres`
- Contrasena: define una que recuerdes
- Deja instalado tambien `pgAdmin` si quieres una interfaz grafica

## 2. Confirmar que quedo instalado

Abre `PowerShell` y ejecuta:

```powershell
psql --version
```

Si no lo reconoce, normalmente el binario queda en algo parecido a:

```powershell
C:\Program Files\PostgreSQL\16\bin
```

Puedes agregar esa ruta al `PATH` o ejecutar `psql` desde ahi.

## 3. Crear la base de datos

En PowerShell:

```powershell
psql -U postgres -h localhost -p 5432
```

Luego dentro de PostgreSQL:

```sql
CREATE DATABASE mayaprint_flexo_web;
```

Salir:

```sql
\q
```

## 4. Cargar el esquema monimo

El esquema inicial quedo aquA:

[flexo-core-postgres.sql](C:\Users\jesquiv\Documents\New%20project\mayaprint-flexo-web\database\flexo-core-postgres.sql)

Ejecuta:

```powershell
psql -U postgres -h localhost -p 5432 -d mayaprint_flexo_web -f "C:\Users\jesquiv\Documents\New project\mayaprint-flexo-web\database\flexo-core-postgres.sql"
```

## 5. Verificar tablas

Conectate:

```powershell
psql -U postgres -h localhost -p 5432 -d mayaprint_flexo_web
```

Y luego:

```sql
\dt
```

Deberias ver, entre otras:

- `tenant`
- `usuario`

## 6. Configurar la app web

En la raiz del proyecto:

`C:\Users\jesquiv\Documents\New project\mayaprint-flexo-web`

1. Copia:

`\.env.example` -> `\.env`

2. Abre `\.env` y coloca tu contrasena real de PostgreSQL en:

`DB_PASSWORD=...`

3. Instala dependencias si aun no lo hiciste:

```powershell
npm install
```

4. Prueba la conexion desde Node:

```powershell
npm run db:check
```

5. Si eso sale bien, arranca la app:

```powershell
npm start
```

6. Y si quieres validar por navegador, abre:

[http://localhost:3000/api/database/health](http://localhost:3000/api/database/health)
- `socio`
- `maquina`
- `maquina_capacidad`
- `material`
- `troquel`
- `version_costos`
- `costo_general`
- `costo_acabado`
- `cotizacion`
- `calculo_flexo`
- `cantidad_calculo_flexo`
- `calculo_flexo_proceso`
- `calculo_flexo_proceso_variable`

## 6. QuA NO estamos montando todavna

Por ahora dejamos fuera:

- SAP en vivo
- sincronizacion automAtica
- Ardenes de produccion completas
- RLS
- multi-mAdulo completo (`lito`, `gran formato`, etc.)

La intencion es arrancar con una base local funcional para:

- catalogos
- cotizaciones
- cAlculos flexo
- linea de procesos

## 7. Siguiente paso despuAs de instalar

Cuando ya tengas la base creada y el esquema cargado, lo siguiente serna:

1. Conectar Node/PostgreSQL en el proyecto
2. Crear repositorios para catalogos
3. Importar `mAquinas`, `materia prima`, `troqueles` y `costos`
4. Guardar la `cotizacion` y la `linea de procesos`

## 8. Comentario importante

Este esquema es una base monima derivada de tu `schema.sql` original, pero ajustada al flujo web actual. No reemplaza todavna el esquema grande; es el punto de arranque prActico.

