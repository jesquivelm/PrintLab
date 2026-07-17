param(
    [string]$Version = "3",
    [switch]$SkipObfuscation
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $rootDir "Entregable-PrintLab-v$Version"
$appDir = Join-Path $outDir "app"

# Clean previous output
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }

Write-Host "=== Empaquetando PrintLab v$Version ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. Copy project to app/ ──
Write-Host "[1/5] Copiando proyecto a $appDir ..." -ForegroundColor Yellow
# Use robocopy for reliable mirror copying with exclusions
# /XD excludes directories, /XF excludes files (no wildcards in names)
$xd = '/XD', '.git', 'node_modules', 'backups', '.vs', 'scratch', 'Entregable-PrintLab-v2', 'Entregable-PrintLab-v3', 'Entrega_PrintLab_Beta'
$xf = '/XF', '.env', 'id_local', 'id_local.pub', 'sustratos.csv', 'tmp_catalogs.json', 'Instalar App.txt'
robocopy $rootDir $appDir /MIR $xd $xf /NJH /NJS /NDL /NP /R:1 /W:1 2>&1 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

# Remove any leftover large/temp files by extension
Get-ChildItem $appDir -Recurse -Include '*.dump', '*.zip', '*.db', 'repomix-output.xml', 'backup_aiven*', 'backup_completo*' -File -ErrorAction SilentlyContinue | Remove-Item -Force

# Clean up files that shouldn't be in the package
@('.env', 'id_local', 'id_local.pub', 'printlab-db.dump', 'Instalar App.txt') | ForEach-Object {
    $f = Join-Path $appDir $_
    if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
}
# Keep logs/, storage/, outputs/ for runtime data
if (Test-Path (Join-Path $appDir "storage")) { Remove-Item (Join-Path $appDir "storage") -Recurse -Force -ErrorAction SilentlyContinue }

# ── 2. Obfuscate backend files ──
if (-not $SkipObfuscation) {
    Write-Host "[2/5] Ofuscando archivos backend ..." -ForegroundColor Yellow
    # Save originals to obfuscated-backup/
    $backupDir = Join-Path $outDir "obfuscated-backup"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    $filesToObfuscate = @(
        'server.js',
        'inventory-service.js',
        'process-quote-service.js',
        'db\postgres.js',
        'services\audit-service.js',
        'services\email-service.js',
        'services\exchange-rate-service.js',
        'services\identity-service.js',
        'services\sap-di-api.js',
        'services\sap-service-layer.js',
        'services\security-config-service.js'
    )

    $filesToObfuscate | ForEach-Object {
        $srcPath = Join-Path $appDir $_
        $backupName = ($_ -replace '[/\\]', '_') + ".original.js"
        $backupPath = Join-Path $backupDir $backupName
        if (Test-Path $srcPath) {
            # Backup original
            Copy-Item $srcPath $backupPath -Force
            # Obfuscate
            $relDir = Split-Path $_ -Parent
            if ($relDir -and $relDir -ne '.') {
                $null = New-Item -ItemType Directory -Path (Join-Path $appDir $relDir) -Force
            }
            Write-Host "    Ofuscando: $_" -ForegroundColor Gray
            $obfuscator = Join-Path $rootDir "node_modules\.bin\javascript-obfuscator.cmd"
            & $obfuscator $srcPath --output $srcPath --compact true --control-flow-flattening true --control-flow-flattening-threshold 0.75 --numbers-to-expressions true --simplify true --string-array-encoding 'base64' --string-array-threshold 0.75 --transform-object-keys true --unicode-escape-sequence false 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "    ERROR ofuscando $_" -ForegroundColor Red
            }
        } else {
            Write-Host "    No encontrado: $_ (saltando)" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "[2/5] Ofuscacion saltada (--SkipObfuscation)" -ForegroundColor Yellow
}

# ── 3. Copy installer scripts from v2 ──
Write-Host "[3/5] Copiando scripts de instalacion ..." -ForegroundColor Yellow
$v2Dir = Join-Path $rootDir "Entregable-PrintLab-v2"
foreach ($script in @('instalar.bat', 'instalar.ps1', 'iniciar.bat')) {
    $src = Join-Path $v2Dir $script
    $dst = Join-Path $outDir $script
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
    }
}

# ── 4. Copy database dump ──
Write-Host "[4/5] Copiando respaldo de base de datos ..." -ForegroundColor Yellow
$dumpFiles = @(
    (Join-Path $rootDir "printlab-db.dump"),
    (Join-Path $rootDir "backup_completo_2026-07-12.sql")
)
$dumpCopied = $false
foreach ($df in $dumpFiles) {
    if (Test-Path $df) {
        $ext = [System.IO.Path]::GetExtension($df)
        $dst = Join-Path $outDir "printlab-db$ext"
        Copy-Item $df $dst -Force
        Write-Host "    Backup copiado: $dst" -ForegroundColor Gray
        $dumpCopied = $true
        break
    }
}
if (-not $dumpCopied) {
    Write-Host "    AVISO: No se encontro respaldo de base de datos" -ForegroundColor Yellow
}

# ── 5. Create LEEME.txt ──
Write-Host "[5/5] Creando LEEME.txt ..." -ForegroundColor Yellow
$leeme = @"
=================================================================
   PRINTLAB - PAQUETE DE INSTALACION v$Version
=================================================================

CONTENIDO:
  instalar.bat          -> [DOBLE CLIC] Asistente de instalacion
  instalar.ps1          -> Script PowerShell (ejecutado por instalar.bat)
  iniciar.bat           -> [DOBLE CLIC] Inicia el servidor
  app/                  -> Codigo de la aplicacion
  printlab-db.dump      -> Respaldo de la base de datos
  LEEME.txt             -> Este archivo

=================================================================
INSTALACION (SOLO LA PRIMERA VEZ)
=================================================================

  1. Extraer todo el contenido del ZIP en una carpeta

  2. Dar DOBLE CLIC en "instalar.bat" como Administrador

  3. El asistente le pedira:

       Puerto web        -> Puerto donde se vera la pagina (Enter = 9090)
       IP del servidor BD -> Direccion del servidor PostgreSQL (Enter = localhost)
       Puerto BD          -> Puerto de PostgreSQL (Enter = 5432)
       Nombre BD          -> Nombre de la base de datos (Enter = printlab)
       Usuario BD         -> Usuario de PostgreSQL (Enter = postgres)
       Contrasena BD      -> Contrasena del usuario de PostgreSQL
       Contrasena admin   -> Clave de emergencia del usuario 'admin'

  4. El asistente:
       a) Crea el archivo .env con esos datos
       b) Instala PostgreSQL 18 si no esta presente (opcional)
       c) Instala Node.js si no esta presente (opcional)
       d) Crea la base de datos y restaura el dump
       e) Ejecuta npm install
       f) Aplica la migracion de seguridad

=================================================================
INICIAR LA APLICACION (USO DIARIO)
=================================================================

  Dar DOBLE CLIC en "iniciar.bat"
  - O -
  Abrir PowerShell en app\ y ejecutar: node server.js

  Abrir http://localhost:9090 en el navegador
  (o el puerto que haya configurado durante la instalacion)

=================================================================
CREDENCIALES POR DEFECTO
=================================================================
  Usuario regular: jesquiv / 1234
  Admin emergencia: admin / (la que ingreso durante instalacion)

=================================================================
REQUISITOS DEL SISTEMA
=================================================================
  Sistema operativo: Windows 10/11 o Windows Server 2019+
  Espacio: ~500 MB libres
  RAM: 4 GB minimo
  Puerto 9090 libre (o el que haya configurado)

"@
Set-Content -Path (Join-Path $outDir "LEEME.txt") -Value $leeme -Encoding UTF8

Write-Host ""
Write-Host "=== EMPAQUETADO COMPLETADO ===" -ForegroundColor Green
Write-Host "Salida: $outDir" -ForegroundColor White
Write-Host ""
