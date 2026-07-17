# Prompt: Generar Entregable PrintLab

Eres un asistente experto en empaquetar y distribuir la aplicación PrintLab. Debes generar un paquete de entrega (Entregable-PrintLab-v{N}) siguiendo EXACTAMENTE estos pasos en orden. No te saltes ninguno.

---

## 0. Requisitos previos

- PostgreSQL 17+ corriendo en `localhost:5432`
- Base de datos `printlab` con datos reales
- Usuario `postgres` con contraseña `Calg.1984`
- Node.js 18+ instalado
- `javascript-obfuscator` instalado globalmente (`npm install -g javascript-obfuscator`)
- La raíz del proyecto es `E:\Github\PrintLab`
- Git repo en la raíz

---

## 1. Crear dump de la base de datos

```powershell
# Sobre-escribe el dump existente en la raíz del proyecto
$env:PGPASSWORD="Calg.1984"
pg_dump -U postgres -h localhost -p 5432 -Fc --blobs -f "E:\Github\PrintLab\printlab-db.dump" printlab
```

- Usar SIEMPRE `-Fc` (formato custom comprimido) con `--blobs`
- NO usar `--no-blobs`, `--no-owner`, ni `--clean`
- El dump debe quedar en la raíz del proyecto

---

## 2. Verificar el dump (OBLIGATORIO)

Crear una base de datos temporal, restaurar el dump, y comparar tabla por tabla:

```powershell
$env:PGPASSWORD="Calg.1984"
psql -U postgres -h localhost -p 5432 -c "DROP DATABASE IF EXISTS printlab_test;"
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE printlab_test;"
pg_restore -U postgres -h localhost -p 5432 -d printlab_test "E:\Github\PrintLab\printlab-db.dump"
```

Luego comparar TODAS las tablas:

```powershell
$tables = psql -U postgres -h localhost -p 5432 -d printlab -t -A -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1;"
$sqlParts = @()
foreach ($t in $tables) {
    $sqlParts += "SELECT '$t' AS tbl, count(*) AS cnt FROM `"$t`""
}
$query = ($sqlParts -join " UNION ALL ") + " ORDER BY 1;"
$liveLines = psql -U postgres -h localhost -p 5432 -d printlab -t -A -c $query
$testLines = psql -U postgres -h localhost -p 5432 -d printlab_test -t -A -c $query

$liveHash = @{}; $testHash = @{}
foreach ($line in $liveLines -split "`n") { if ($line -match '^(.+?)\|(.+)$') { $liveHash[$matches[1]] = $matches[2] } }
foreach ($line in $testLines -split "`n") { if ($line -match '^(.+?)\|(.+)$') { $testHash[$matches[1]] = $matches[2] } }
$diffs = @()
foreach ($t in $tables) { if ($liveHash[$t] -ne $testHash[$t]) { $diffs += "${t}: LIVE=$($liveHash[$t]) TEST=$($testHash[$t])" } }
if ($diffs.Count -eq 0) { Write-Host "VERIFIED: $($tables.Count) tables match" } else { Write-Host "MISMATCH:"; $diffs }
```

Si hay diferencias: DETENERSE e informar. No continuar.

Luego limpiar:

```powershell
psql -U postgres -h localhost -p 5432 -c "DROP DATABASE IF EXISTS printlab_test;"
```

---

## 3. Determinar el número de versión

Buscar en `E:\Github\PrintLab\` carpetas `Entregable-PrintLab-v*`. El próximo número es el que sigue. Ej: si existe `v1`, `v2`, el nuevo es `v3`.

Definir variable: `$vNum = N` (el número que sigue)

---

## 4. Crear el directorio de entrega

```powershell
$dest = "E:\Github\PrintLab\Entregable-PrintLab-v$vNum"
New-Item -ItemType Directory -Path $dest -Force
```

---

## 5. Copiar el proyecto (EXCLUYENDO basura)

Usar robocopy para copiar todo EXCEPTO:

- `.git/`
- `node_modules/`
- `backups/`
- `Entrega_*/`
- `Entregable-*/`
- `scripts/pack.ps1`

```powershell
robocopy "E:\Github\PrintLab" "$dest" /E /NP /NDL /NFL `
  /XD .git node_modules backups Entrega_* Entregable-* `
  /XF "scripts\pack.ps1"
```

---

## 6. Copiar el dump

```powershell
Copy-Item "E:\Github\PrintLab\printlab-db.dump" "$dest\printlab-db.dump" -Force
```

---

## 7. Copiar los scripts de instalación desde v2

Los scripts correctos están en `Entregable-PrintLab-v2/`. Copiarlos SIEMPRE desde ahí, NO de la raíz del proyecto:

```powershell
Copy-Item "E:\Github\PrintLab\Entregable-PrintLab-v2\instalar.bat" "$dest\instalar.bat" -Force
Copy-Item "E:\Github\PrintLab\Entregable-PrintLab-v2\instalar.ps1" "$dest\instalar.ps1" -Force
Copy-Item "E:\Github\PrintLab\Entregable-PrintLab-v2\iniciar.bat" "$dest\iniciar.bat" -Force
```

Si no existe `Entregable-PrintLab-v2/`, pedir instrucciones.

---

## 8. Obfuscar archivos backend JS

Lista de archivos a obfuscar (orden específico):

1. `app/server.js`
2. `app/inventory-service.js`
3. `app/process-quote-service.js`
4. `app/db/postgres.js`
5. `app/services/audit-service.js`
6. `app/services/email-service.js`
7. `app/services/exchange-rate-service.js`
8. `app/services/identity-service.js`
9. `app/services/sap-di-api.js`
10. `app/services/sap-service-layer.js`
11. `app/services/security-config-service.js`

Para CADA archivo:

```powershell
# 1. Respaldo del original
$orig = "$dest\$relativePath.original"
Copy-Item "$dest\$relativePath" $orig -Force

# 2. Obfuscar (SOBREESCRIBIR el original)
javascript-obfuscator "$dest\$relativePath" --output "$dest\$relativePath" --compact true --control-flow-flattening true --control-flow-flattening-threshold 0.7 --numbers-to-expressions true --simplify true --shuffle-string-array true --split-strings true --string-array-threshold 0.8 --transform-object-keys true --unicode-escape-sequence false

# 3. Verificar que el archivo obfuscado no está vacío y es diferente al original
if ((Get-Item "$dest\$relativePath").Length -eq 0) { Write-Error "OBFUSCATION FAILED: $relativePath is empty!" }
```

- Mover los respaldos a `$dest\obfuscated-backup\`
  - Nombrar con el path limpio: `app_server.js.original`, `app_services_audit-service.js.original`, etc.

```powershell
New-Item -ItemType Directory -Path "$dest\obfuscated-backup" -Force
Move-Item "$dest\$relativePath.original" "$dest\obfuscated-backup\$flatName.original" -Force
```

---

## 9. LIMPIAR el paquete (LO MÁS CRÍTICO)

Eliminar TODO lo que el cliente NO necesita:

| Eliminar | Razón |
|---|---|
| `app/AGENTS.md` | Instrucciones internas de desarrollo |
| `app/scripts/` (TODO) | Scripts de desarrollo/empaquetado |
| `app/docs/` (TODO) | Documentación interna |
| `app/reference/` (TODO) | Materiales de referencia |
| `app/artifacts/` (TODO) | Capturas de pantalla de desarrollo |
| `app/sql/` (TODO) | Scripts SQL (el dump ya lo tiene todo) |
| `app/db/server.js` | Archivo huérfano, no referenciado |
| `app/db/postgres (2).js` | Archivo duplicado |
| `app/public/orden-produccion - copia.*` | Copias de respaldo |
| `app/Proceso_Troquel.png` | Imagen no referenciada |
| `app/.gitignore` | Archivo de desarrollo |
| `app/README.md` | Documentación de desarrollo |
| `app/server_error.log` | Log de desarrollo |
| `app/server_output.log` | Log de desarrollo |
| `app/logs/*` (TODO el contenido) | Logs de desarrollo (PERO conservar directorio vacío) |
| `app/integrations/README.md` | Documentación interna |
| `app/db/adapters/` | Directorio vacío con README interno |
| `app/db/repositories/` | Directorio vacío |
| `obfuscated-backup/` | Respaldos internos (el cliente no necesita verlos) |

IMPORTANTE: Después de limpiar logs/, el directorio `app/logs/` debe existir (vacío) para que la app pueda escribir logs en tiempo de ejecución.

```powershell
# Ejemplo de limpieza:
Remove-Item -Recurse -Force "$dest\obfuscated-backup"
Remove-Item -Force "$dest\app\AGENTS.md"
Remove-Item -Recurse -Force "$dest\app\scripts"
Remove-Item -Recurse -Force "$dest\app\docs"
Remove-Item -Recurse -Force "$dest\app\reference"
Remove-Item -Recurse -Force "$dest\app\artifacts"
Remove-Item -Recurse -Force "$dest\app\sql"
Remove-Item -Force "$dest\app\db\server.js" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\db\postgres (2).js" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\public\orden-produccion - copia.html" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\public\orden-produccion - copia.js" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\Proceso_Troquel.png" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\.gitignore" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\README.md" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\server_error.log" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\server_output.log" -ErrorAction SilentlyContinue
Remove-Item "$dest\app\logs\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$dest\app\db\adapters" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$dest\app\db\repositories" -ErrorAction SilentlyContinue
Remove-Item -Force "$dest\app\integrations\README.md" -ErrorAction SilentlyContinue
```

---

## 10. Actualizar `app/.env.example`

Reemplazar el contenido con valores locales de instalación:

```
PORT=9090
DATABASE_URL=postgresql://postgres:password@localhost:5432/printlab?sslmode=disable
PGSSLMODE=disable
ADMIN_EMERGENCY_PASSWORD=
```

---

## 11. Actualizar `app/package.json`

Eliminar scripts que referencien archivos eliminados (`scripts/`). Debe quedar solo:

```json
"scripts": {
  "start": "node server.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

NO tocar las dependencias.

---

## 12. Actualizar `LEEME.txt`

Buscar el LEEME de la versión anterior (`Entregable-PrintLab-v{anterior}/LEEME.txt`) y copiarlo. Luego actualizar:

- Línea 2: Cambiar a `PRINTLAB - PAQUETE DE INSTALACION v{N}`
- Línea 10: `printlab-db.dump      -> Respaldo de la base de datos` (eliminar mención a `obfuscated-backup/` si existe)
- Verificar que todo el contenido sea correcto para la versión actual

---

## 13. Verificación final del paquete

```powershell
$files = Get-ChildItem -Recurse "$dest" -File
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
$fileCount = $files.Count
Write-Host "Total files: $fileCount"
Write-Host "Total size:  $([math]::Round($totalSize/1MB, 1)) MB"
```

Verificar manualmente:
- [ ] `app/server.js` existe y NO es legible (obfuscado)
- [ ] `app/inventory-service.js` existe y NO es legible (obfuscado)
- [ ] `app/db/postgres.js` existe y NO es legible (obfuscado)
- [ ] `app/services/*.js` existen y NO son legibles (obfuscados)
- [ ] `printlab-db.dump` existe (12-15 MB aprox)
- [ ] `instalar.bat`, `instalar.ps1`, `iniciar.bat` existen
- [ ] `LEEME.txt` existe y dice la versión correcta
- [ ] `app/storage/` existe con archivos adjuntos
- [ ] `app/logs/` existe (vacío)
- [ ] `app/outputs/` existe
- [ ] NO existe `obfuscated-backup/`
- [ ] NO existe `app/AGENTS.md`
- [ ] NO existe `app/scripts/`
- [ ] NO existe `app/docs/`
- [ ] NO existe `app/reference/`
- [ ] NO existe `app/artifacts/`
- [ ] NO existe `app/sql/`
- [ ] NO existe `app/db/server.js`
- [ ] NO existe `app/README.md`
- [ ] NO existe `app/.gitignore`
- [ ] NO hay archivos `* - copia.*`
- [ ] `app/.env.example` tiene valores locales (localhost, sslmode=disable)
- [ ] `app/package.json` solo tiene scripts `start` y `test`

---

## 14. Informe final

Entregar un resumen con:

- Versión del paquete
- Número de archivos y tamaño total
- Cantidad de tablas en BD y filas totales
- Estado de cada verificación (✓ todo correcto)
- Lista de cambios respecto a la versión anterior (si aplica)

---

## REGLAS DE ORO

1. NO modificar `instalar.bat`, `instalar.ps1`, `iniciar.bat` a menos que haya un cambio explícito. Siempre copiar desde v2.
2. NO modificar los archivos frontend (`app/public/`) bajo ninguna circunstancia.
3. NO agregar ningún archivo nuevo que no existiera en el proyecto original.
4. NO dejar archivos de respaldo, copias, ni basura en el paquete final.
5. NO fallar en la verificación del dump — si hay diferencias, detener todo.
6. NO conservar `obfuscated-backup/` en el paquete final.
7. SIEMPRE verificar que los archivos obfuscados no están vacíos.
8. SIEMPRE limpiar la base de datos de prueba después de verificar.
