param([switch]$skipDb)

# ============================================================
# AUTO-ELEVACION A ADMINISTRADOR
# ============================================================
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    $argsFlat = ""
    if ($skipDb) { $argsFlat = "-skipDb" }
    $psCmd = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" $argsFlat"
    Start-Process powershell -Verb RunAs -ArgumentList $psCmd
    exit
}

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir     = Join-Path -Path $scriptRoot -ChildPath "app"
$dumpFile   = Join-Path -Path $scriptRoot -ChildPath "printlab-db.dump"
$logFile    = Join-Path -Path $scriptRoot -ChildPath "instalar.log"

Remove-Item $logFile -Force -ErrorAction SilentlyContinue

function Write-Title($t) {
    Write-Host ""; Write-Host "  $t" -ForegroundColor Cyan; Write-Host "  $('-' * $t.Length)" -ForegroundColor DarkGray
    Add-Content $logFile "[TITLE] $t"
}
function Write-OK    { Write-Host "  [OK] " -ForegroundColor Green -NoNewline; Write-Host $args[0]; Add-Content $logFile "[OK] $($args[0])" }
function Write-Warn  { Write-Host "  [!] " -ForegroundColor Yellow -NoNewline; Write-Host $args[0]; Add-Content $logFile "[WARN] $($args[0])" }
function Write-Fail  { Write-Host "  [FAIL] " -ForegroundColor Red -NoNewline; Write-Host $args[0]; Add-Content $logFile "[FAIL] $($args[0])" }
function Write-Log($t) { Add-Content $logFile $t }

Add-Content $logFile "=== PRINTLAB INSTALLER LOG ==="
Add-Content $logFile "Inicio: $(Get-Date)"
Add-Content $logFile "Script root: $scriptRoot"
Add-Content $logFile ""

function Read-Input($label, $default, $validate) {
    while ($true) {
        $prompt = "  $label"
        if ($default) { $prompt += " (Enter = $default)" }
        $value = Read-Host $prompt
        if ($value -eq "") { $value = $default }
        if (-not $validate -or ($value -match $validate)) { return $value }
        Write-Warn "Valor invalido."
    }
}
function Read-Secret($label) {
    while ($true) {
        $plain = Read-Host "  $label"
        if ($plain.Length -eq 0) { Write-Warn "La contrasena no puede estar vacia."; continue }
        $confirm = Read-Host "  Confirme la contrasena"
        if ($plain -eq $confirm) { return $plain }
        Write-Warn "Las contrasenas no coinciden. Intentelo de nuevo."
    }
}
function Download-Cached($url, $localPath) {
    if (Test-Path $localPath) {
        Write-OK "Ya existe: $(Split-Path $localPath -Leaf). Usando archivo local."
        Add-Content $logFile "Cache hit: $localPath"
        return $true
    }
    Write-Host "  Descargando $(Split-Path $url -Leaf)..."
    Add-Content $logFile "Descargando: $url"
    try {
        Invoke-WebRequest -Uri $url -OutFile $localPath -UseBasicParsing
        Add-Content $logFile "Descarga exitosa: $localPath"
        return $true
    } catch {
        Add-Content $logFile "ERROR descarga: $_"
        return $false
    }
}

# Buscar PostgreSQL en cualquier version
function Find-PostgreSQL {
    $searchPaths = @(
        "C:\Program Files\PostgreSQL\*\bin\psql.exe"
        "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe"
    )
    foreach ($pattern in $searchPaths) {
        $exes = Get-ChildItem $pattern -ErrorAction SilentlyContinue
        foreach ($exe in $exes) {
            return @{Bin= $exe.Directory.FullName; Version= $exe.Directory.Parent.Name}
        }
    }
    $pathExe = (Get-Command "psql" -ErrorAction SilentlyContinue).Source
    if ($pathExe) {
        return @{Bin= (Split-Path -Parent $pathExe); Version= "desde PATH"}
    }
    return $null
}

function Read-PostgresPort($pgDataDir) {
    $confFile = Join-Path -Path $pgDataDir -ChildPath "postgresql.conf"
    if (-not (Test-Path $confFile)) { return $null }
    $content = Get-Content $confFile -ErrorAction SilentlyContinue
    foreach ($line in $content) {
        $line = $line -replace '#.*','' -replace '\s+',''
        if ($line -match '^port=(\d+)$') {
            return [int]::Parse($matches[1])
        }
    }
    return $null
}

function Wait-PostgresService($maxWaitSec = 90) {
    $svc = Get-Service "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $svc) { return $false }
    $elapsed = 0
    $interval = 2
    Write-Host "  Esperando servicio PostgreSQL..." -NoNewline
    while ($elapsed -lt $maxWaitSec) {
        $svc.Refresh()
        if ($svc.Status -eq 'Running') {
            Write-Host " OK" -ForegroundColor Green
            return $true
        }
        if ($svc.Status -eq 'Stopped') {
            Write-Host " (detenido, iniciando...)" -NoNewline
            Start-Service $svc.Name -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        if ($elapsed % 10 -eq 0) { Write-Host "." -NoNewline }
    }
    Write-Host " (tiempo agotado)" -ForegroundColor Yellow
    return ($svc.Status -eq 'Running')
}

function Test-DbConnection($pgHostParam, $port, $user, $pass) {
    $env:PGPASSWORD = $pass
    $result = & psql -U $user -h $pgHostParam -p $port -c "SELECT 1 AS test" -t 2>&1
    $ok = ($LASTEXITCODE -eq 0)
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    return $ok
}

# ============================================================
# BANNER + RECOLECCION DE DATOS
# ============================================================
Write-Host ""
Write-Host "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" -ForegroundColor DarkGray
Write-Host "  x  PRINTLAB - ASISTENTE DE INSTALACION  x" -ForegroundColor Cyan
Write-Host "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Ingrese los datos de configuracion."
Write-Host "  Presione Enter para aceptar el valor por defecto."
Write-Host ""

Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
Write-Host "  |  1. CONFIGURACION DEL SERVIDOR WEB                |" -ForegroundColor Yellow
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
$webPort    = Read-Input "Puerto del servidor web" "9090" '^\d+$'

Write-Host ""
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
Write-Host "  |  2. CONEXION A LA BASE DE DATOS                   |" -ForegroundColor Yellow
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
$dbHost     = Read-Input "Direccion IP o nombre del servidor" "localhost"
$dbPuerto   = Read-Input "Puerto de la base de datos" "5432" '^\d+$'
$dbNombre   = Read-Input "Nombre de la base de datos" "printlab"
$dbUsuario  = Read-Input "Usuario de la base de datos" "postgres"
$dbPassword = Read-Secret "Contrasena del usuario $dbUsuario"

Write-Host ""
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
Write-Host "  |  3. SEGURIDAD                                     |" -ForegroundColor Yellow
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
$emergencyPass = Read-Input "Contrasena de emergencia (usuario admin)" "admin"

Write-Host ""
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
Write-Host "  |  RESUMEN DE CONFIGURACION                         |" -ForegroundColor Green
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
Write-Host "  |  Puerto web:       $($webPort.PadRight(35))|" -ForegroundColor White
$hostPortDisp = "$dbHost`:$dbPuerto"
Write-Host "  |  Servidor BD:      $($hostPortDisp.PadRight(35))|" -ForegroundColor White
Write-Host "  |  Base de datos:    $($dbNombre.PadRight(35))|" -ForegroundColor White
Write-Host "  |  Usuario BD:       $($dbUsuario.PadRight(35))|" -ForegroundColor White
Write-Host "  |  Contrasena BD:    $($dbPassword.PadRight(35))|" -ForegroundColor White
Write-Host "  |  Admin emergencia: $(('admin / ' + $emergencyPass).PadRight(35))|" -ForegroundColor White
Write-Host "  +---------------------------------------------------+" -ForegroundColor DarkGray
Write-Host ""
$conf = Read-Host "  Los datos son correctos? (s/N)"
if ($conf -ne "s") { Write-Host "  Cancelado."; exit 1 }

Add-Content $logFile "Configuracion aceptada: puerto=$webPort host=$($dbHost):$dbPuerto db=$dbNombre user=$dbUsuario"

# ============================================================
# CREAR .env
# ============================================================
Write-Title "Creando archivo .env"
$envFile = Join-Path -Path $appDir -ChildPath ".env"
$dbUrl = "postgresql://$dbUsuario`:$dbPassword@$dbHost`:$dbPuerto/$dbNombre`?sslmode=disable"
$envContent = @"
PORT=$webPort
DATABASE_URL=$dbUrl
PGSSLMODE=disable
ADMIN_EMERGENCY_PASSWORD=$emergencyPass
"@
Set-Content -Path $envFile -Value $envContent -Encoding UTF8
Add-Content $logFile ".env creado: $envFile"
Write-OK ".env creado"
Write-Host "  DATABASE_URL = $dbUrl"

# ============================================================
# PASO 1: POSTGRESQL
# ============================================================
Write-Title "Paso 1: PostgreSQL"

$pgFound = $false
$pgData = $null
$pgInfo = Find-PostgreSQL
if ($pgInfo) {
    $pgFound = $true
    $pgBin = $pgInfo.Bin
    $pgData = Join-Path (Split-Path $pgBin -Parent) "data"
    Write-OK "PostgreSQL detectado: $($pgBin)"
}

if (-not $pgFound) {
    Write-Warn "PostgreSQL no esta instalado."

    # Buscar instalador en raiz primero (el usuario pudo llevarlo aparte)
    $pgInstaller = Join-Path $scriptRoot "postgresql-18.4-1-windows-x64.exe"
    $existingInstaller = Get-ChildItem "$scriptRoot\postgresql-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingInstaller) {
        $pgInstaller = $existingInstaller.FullName
        Write-OK "Instalador local detectado: $(Split-Path $pgInstaller -Leaf)"
    } else {
        Write-Host "  No se encontro instalador local. Se descargara si confirma." -ForegroundColor DarkGray
    }

    if ($pgData -and (Test-Path $pgData)) {
        Write-Warn "Instalacion anterior detectada en $pgData"
        Write-Warn "La contrasena anterior persistira, NO se cambiara."
        $resp = Read-Host "  Eliminar carpeta data anterior? (s/N)"
        if ($resp -eq "s") {
            $svc = Get-Service "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($svc) { Stop-Service $svc.Name -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2 }
            Remove-Item $pgData -Recurse -Force -ErrorAction Stop
            Write-OK "Data eliminada."
            Add-Content $logFile "Data dir eliminado: $pgData"
        }
    }

    # Detectar instalacion previa via registro (aunque psql no este en PATH)
    $pgUninstallKey = Get-ChildItem "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue | Where-Object { $_.GetValue("DisplayName") -like "PostgreSQL*" } | Select-Object -First 1
    if ($pgUninstallKey) {
        Write-Warn "Instalacion previa de PostgreSQL detectada en el sistema."
        $resp = Read-Host "  Desinstalar antes de continuar? (s/N)"
        if ($resp -eq "s") {
            $uninstStr = $pgUninstallKey.GetValue("UninstallString")
            if ($uninstStr) {
                $svc = Get-Service "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($svc) { Stop-Service $svc.Name -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2 }
                Write-Host "  Desinstalando PostgreSQL..." -NoNewline
                if ($uninstStr -match 'msiexec') {
                    $guid = $pgUninstallKey.PSChildName
                    Start-Process -Wait msiexec -ArgumentList "/x $guid /quiet /norestart" -PassThru | Out-Null
                } else {
                    Start-Process -Wait -FilePath ($uninstStr -split ' ')[0] -ArgumentList ($uninstStr -split ' ')[1..99] -PassThru | Out-Null
                }
                Write-Host " OK" -ForegroundColor Green
                Add-Content $logFile "PostgreSQL desinstalado via registro"
                Start-Sleep -Seconds 3
            }
        }
    }

    $resp = Read-Host "  Descargar e instalar PostgreSQL automaticamente? (s/N)"
    if ($resp -eq "s") {
        $ok = Download-Cached "https://get.enterprisedb.com/postgresql/postgresql-18.4-1-windows-x64.exe" $pgInstaller
        if (-not $ok) { Write-Fail "No se pudo descargar PostgreSQL."; exit 1 }
        Write-Host "  Instalando (esto puede tomar varios minutos)..."
        Add-Content $logFile "Instalando PostgreSQL..."
        $installDir = "$env:ProgramFiles\PostgreSQL\18"
        $pgData = "$installDir\data"
        $proc = Start-Process -Wait -FilePath $pgInstaller -ArgumentList "--mode unattended --unattendedmodeui minimal --superpassword $dbPassword --prefix `"$installDir`" --datadir `"$pgData`"" -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Fail "Instalador de PostgreSQL termino con codigo $($proc.ExitCode)"
            Add-Content $logFile "PostgreSQL installer exit code: $($proc.ExitCode)"
            exit 1
        }
        Write-OK "PostgreSQL instalado."
        Add-Content $logFile "PostgreSQL instalado exitosamente"

        $pgBin = "$installDir\bin"
        $env:Path += ";$pgBin"
        $pgFound = $true
        $skipDb = $false

        # Leer el puerto real desde postgresql.conf
        $realPort = Read-PostgresPort $pgData
        if ($realPort -and $realPort -ne $dbPuerto) {
            Write-Warn "PostgreSQL escucha en puerto $realPort (configurado: $dbPuerto)"
            $resp = Read-Host "  Usar puerto $realPort en lugar de $dbPuerto? (S/n)"
            if ($resp -ne "n") { $dbPuerto = $realPort.ToString() }
        }

        # Esperar a que el servicio realmente este corriendo
        $svcStarted = Wait-PostgresService 90
        if (-not $svcStarted) {
            Write-Warn "El servicio de PostgreSQL no responde. Puede iniciarlo manualmente."
        }
    } else {
        Write-Warn "Continuando sin PostgreSQL. Solo se configuro el .env."
        Add-Content $logFile "PostgreSQL no instalado por eleccion del usuario"
        $skipDb = $true
    }
}

$env:Path += ";$pgBin"

# ============================================================
# PASO 2: NODE.JS
# ============================================================
Write-Title "Paso 2: Node.js"

$nodePath = (Get-Command "node" -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Warn "Node.js no detectado."

    # Buscar instalador en raiz primero
    $nodeInstaller = Join-Path $scriptRoot "node-v22.14.0-x64.msi"
    $existingNode = Get-ChildItem "$scriptRoot\node-v*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingNode) {
        $nodeInstaller = $existingNode.FullName
        Write-OK "Instalador local detectado: $(Split-Path $nodeInstaller -Leaf)"
    } else {
        Write-Host "  No se encontro instalador local de Node.js. Se descargara si confirma." -ForegroundColor DarkGray
    }

    $resp = Read-Host "  Descargar e instalar Node.js automaticamente? (s/N)"
    if ($resp -eq "s") {
        $ok = Download-Cached "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi" $nodeInstaller
        if (-not $ok) { Write-Fail "No se pudo descargar Node.js."; exit 1 }
        Add-Content $logFile "Instalando Node.js..."
        $p = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait -PassThru -NoNewWindow
        $exitCode = $p.ExitCode
        if ($exitCode -eq 0 -or $exitCode -eq 1641 -or $exitCode -eq 3010) {
            Write-OK "Node.js instalado."
        } else {
            Write-Fail "Instalador de Node.js fallo (codigo $exitCode)."
            Write-Warn "Puede instalar Node.js manualmente:"
            Write-Host "  1. Ejecute directamente:"
            Write-Host "     $(Split-Path $nodeInstaller -Leaf)"
            Write-Host "  2. Luego ejecute instalar.bat de nuevo"
            Add-Content $logFile "ERROR: Node.js installer exit code $exitCode"
            exit 1
        }
        $env:Path += ";C:\Program Files\nodejs"
        Write-OK "Node.js instalado."
    } else {
        Write-Fail "Node.js es necesario. Instale manualmente y ejecute de nuevo."
        Add-Content $logFile "Node.js no instalado - ABORTANDO"
        exit 1
    }
} else {
    $nodeVer = node --version
    Write-OK "Node.js detectado: $nodeVer"
    Add-Content $logFile "Node.js detectado: $nodeVer"
}

$env:Path += ";$pgBin"

# ============================================================
# PASO 3 + 4: CREAR BD Y RESTAURAR DUMP
# ============================================================
if (-not $skipDb -and $pgFound) {
    Write-Title "Paso 3: Base de datos"

    $pgDataDir = if ($pgInfo) { Join-Path (Split-Path $pgInfo.Bin -Parent) "data" } else { $pgData }

    # Bucle de conexion con reintento y opcion de cambiar puerto/host
    $connected = $false
    $maxDbRetries = 20
    for ($attempt = 1; $attempt -le $maxDbRetries; $attempt++) {
        $testResult = Test-DbConnection $dbHost $dbPuerto $dbUsuario $dbPassword
        if ($testResult) { $connected = $true; break }

        Write-Warn ("Intento " + $attempt + "/" + $maxDbRetries + ": No se pudo conectar a " + $dbHost + ":" + $dbPuerto)

        if ($attempt -eq $maxDbRetries) {
            Write-Host ""
            Write-Host "  Opciones:" -ForegroundColor Yellow
            Write-Host "    [R] Reintentar conexion" -ForegroundColor White
            Write-Host "    [P] Cambiar puerto" -ForegroundColor White
            Write-Host "    [H] Cambiar direccion del servidor" -ForegroundColor White
            Write-Host "    [S] Saltar configuracion de base de datos" -ForegroundColor White
            Write-Host "    [C] Cancelar" -ForegroundColor White

            # Detectar puerto real desde postgresql.conf si existe
            if (Test-Path $pgDataDir) {
                $actualPort = Read-PostgresPort $pgDataDir
                if ($actualPort -and $actualPort -ne $dbPuerto) {
                    Write-Host "  Postgresql.conf indica puerto: $actualPort" -ForegroundColor Cyan
                }
            }

            $opt = Read-Host "  Opcion (R/p/h/s/C)"
            switch -Wildcard ($opt.ToUpper()) {
                'R' { $attempt = 0; Write-Host "  Reintentando..."; continue }
                'P' { $dbPuerto = Read-Input "Nuevo puerto" $dbPuerto '^\d+$'; $attempt = 0; continue }
                'H' { $dbHost = Read-Input "Nueva direccion" $dbHost; $attempt = 0; continue }
                'S' { $skipDb = $true; break }
                default { Write-Host "  Cancelado."; exit 1 }
            }
        } else {
            Write-Host "  Reintentando en 5 segundos..."
            Start-Sleep -Seconds 5
        }
    }

    if ($connected) {
        Write-OK "Conexion a PostgreSQL exitosa en $dbHost`:$dbPuerto"
        Add-Content $logFile "Conexion PostgreSQL exitosa en $dbHost`:$dbPuerto"

        # Recrear el .env por si cambio el puerto
        $dbUrl = "postgresql://$dbUsuario`:$dbPassword@$dbHost`:$dbPuerto/$dbNombre`?sslmode=disable"
        $envContent = @"
PORT=$webPort
DATABASE_URL=$dbUrl
PGSSLMODE=disable
ADMIN_EMERGENCY_PASSWORD=$emergencyPass
"@
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        Add-Content $logFile ".env actualizado con nueva configuracion de BD"

        $env:PGPASSWORD = $dbPassword

        $dbExists = & psql -U $dbUsuario -h $dbHost -p $dbPuerto -t -A -c "SELECT 1 FROM pg_database WHERE datname='$dbNombre'" 2>$null
        if ($dbExists -eq "1") {
            Write-Warn "La base de datos '$dbNombre' ya existe."
            $resp = Read-Host "  Eliminarla y recrearla? (s/N)"
            if ($resp -eq "s") {
                & psql -U $dbUsuario -h $dbHost -p $dbPuerto -c "DROP DATABASE IF EXISTS $dbNombre WITH (FORCE)" 2>&1 | Out-Null
                & createdb -U $dbUsuario -h $dbHost -p $dbPuerto $dbNombre 2>&1 | Out-Null
                Write-OK "Base de datos recreada"
                Add-Content $logFile "BD '$dbNombre' recreada"
            }
        } else {
            & createdb -U $dbUsuario -h $dbHost -p $dbPuerto $dbNombre 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-OK "Base de datos '$dbNombre' creada"
                Add-Content $logFile "BD '$dbNombre' creada"
            } else {
                Write-Fail "No se pudo crear la base de datos"
                Add-Content $logFile "ERROR creando BD: $?"
                exit 1
            }
        }

        Write-Title "Paso 4: Restaurar dump"
        if (Test-Path $dumpFile) {
            Write-Host "  Restaurando $(Split-Path $dumpFile -Leaf)..."
            Add-Content $logFile "Restaurando dump: $dumpFile"
            $output = & pg_restore -U $dbUsuario -h $dbHost -p $dbPuerto -d $dbNombre -Fc --clean --if-exists $dumpFile 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-OK "Dump restaurado correctamente"
                Add-Content $logFile "Dump restaurado exitosamente"
            } else {
                $errorCount = ($output | Select-String -Pattern "^pg_restore: error:" | Measure-Object).Count
                if ($errorCount -gt 0) {
                    Write-Warn "El dump se restauro con $errorCount errores (objetos existentes omitidos)."
                    Add-Content $logFile "WARN pg_restore: $errorCount errores"
                } else {
                    Write-OK "Dump restaurado correctamente"
                }
            }
        } else {
            Write-Fail "Archivo $(Split-Path $dumpFile -Leaf) no encontrado en $scriptRoot"
            Add-Content $logFile "ERROR: dump no encontrado en $dumpFile"
            exit 1
        }
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        Write-Warn "Configuracion de BD omitida. Solo se configuro el .env."
    }
}

# ============================================================
# PASO 5: INSTALAR DEPENDENCIAS NPM
# ============================================================
Write-Title "Paso 5: Instalar dependencias npm"
Set-Location -Path $appDir
if (Test-Path "node_modules") {
    Write-OK "node_modules ya existe, omitiendo npm install"
    Add-Content $logFile "npm install omitido (node_modules existe)"
} else {
    Add-Content $logFile "Ejecutando npm install en $appDir"
    npm install 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Dependencias instaladas"
        Add-Content $logFile "npm install exitoso"
    } else {
        Write-Fail "Error al instalar dependencias"
        Add-Content $logFile "ERROR npm install: codigo $LASTEXITCODE"
        exit 1
    }
}

# ============================================================
# PASO 6: MIGRACION DE SEGURIDAD
# ============================================================
if (-not $skipDb -and $pgFound -and $connected) {
    Write-Title "Paso 6: Migracion de seguridad"
    $env:PGPASSWORD = $dbPassword
    $migrateResult = & psql -U $dbUsuario -h $dbHost -p $dbPuerto -d $dbNombre -c "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Columna must_change_password agregada/verificada"
        Add-Content $logFile "Migracion must_change_password exitosa"
    } else {
        Write-Fail "No se pudo ejecutar la migracion: $migrateResult"
        Add-Content $logFile "ERROR migracion: $migrateResult"
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# ============================================================
# RESUMEN FINAL
# ============================================================
Add-Content $logFile "=== INSTALACION FINALIZADA $(Get-Date) ==="
Write-Title "INSTALACION COMPLETADA"
Write-Host ""
Write-Host "  Resumen guardado en: $logFile"
Write-Host ""
Write-Host "  Para iniciar PrintLab:"
Write-Host "    Doble clic en iniciar.bat"
Write-Host "    O en PowerShell: cd `"$appDir`" && node server.js"
Write-Host ""
Write-Host "  Aplicacion: http://localhost:$webPort"
Write-Host "  Usuario:    jesquiv"
Write-Host "  Clave:      1234"
Write-Host "  Admin:      admin / $emergencyPass"
Write-Host ""

Set-Location -Path $scriptRoot
pause
