# ============================================
# Script de respaldo de base de datos PrintLab
# ============================================

$DB_NAME = "printlab"
$DB_USER = "postgres"
$DB_PASSWORD = "Calg.1984"
$PG_BIN = "C:\Program Files\PostgreSQL\18\bin"

# Rutas de respaldo
$PRIMARY_BACKUP_PATH = "E:\Respaldo Github\PrintLab\Respaldo Base Datos"
$SECONDARY_BACKUP_PATH = "c:\Respaldos\Printlab\Base de Datos"

# Archivos de log
$PRIMARY_LOG = Join-Path -Path $PRIMARY_BACKUP_PATH -ChildPath "respaldo_printlab.log"
$SECONDARY_LOG = Join-Path -Path $SECONDARY_BACKUP_PATH -ChildPath "respaldo_printlab.log"

# Fecha para el nombre del archivo
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BACKUP_FILE = "printlab_$DATE.sql"

# Funcion para escribir en el log
function Write-Log {
    param([string]$Message, [string]$LogFile)
    $TIMESTAMP = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LOG_ENTRY = "[$TIMESTAMP] $Message"
    Add-Content -Path $LogFile -Value $LOG_ENTRY -Encoding UTF8
}

# Crear directorios si no existen
if (!(Test-Path -Path $PRIMARY_BACKUP_PATH)) {
    New-Item -ItemType Directory -Path $PRIMARY_BACKUP_PATH -Force | Out-Null
    Write-Host "Directorio creado: $PRIMARY_BACKUP_PATH" -ForegroundColor Green
}

if (!(Test-Path -Path $SECONDARY_BACKUP_PATH)) {
    New-Item -ItemType Directory -Path $SECONDARY_BACKUP_PATH -Force | Out-Null
    Write-Host "Directorio creado: $SECONDARY_BACKUP_PATH" -ForegroundColor Green
}

# Ruta completa del archivo de respaldo
$PRIMARY_FILE = Join-Path -Path $PRIMARY_BACKUP_PATH -ChildPath $BACKUP_FILE
$SECONDARY_FILE = Join-Path -Path $SECONDARY_BACKUP_PATH -ChildPath $BACKUP_FILE

# Variable de entorno para la contraseña
$env:PGPASSWORD = $DB_PASSWORD

# Ejecutar pg_dump
Write-Host "Iniciando respaldo de la base de datos $DB_NAME..." -ForegroundColor Cyan
Write-Log "=========================================" $PRIMARY_LOG
Write-Log "INICIO DEL PROCESO DE RESPALDO" $PRIMARY_LOG
Write-Log "Base de datos: $DB_NAME" $PRIMARY_LOG
Write-Log "Archivo de respaldo: $BACKUP_FILE" $PRIMARY_LOG

try {
    & "$PG_BIN\pg_dump.exe" -U $DB_USER -d $DB_NAME -F p -f $PRIMARY_FILE 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        $FILE_SIZE = (Get-Item $PRIMARY_FILE).Length / 1MB
        $FILE_SIZE_STR = "$([math]::Round($FILE_SIZE, 2)) MB"
        
        Write-Host "Respaldo creado exitosamente en: $PRIMARY_FILE" -ForegroundColor Green
        Write-Log "ESTADO: EXITOSO" $PRIMARY_LOG
        Write-Log "Archivo primario: $PRIMARY_FILE" $PRIMARY_LOG
        Write-Log "Tamano: $FILE_SIZE_STR" $PRIMARY_LOG
        
        # Copiar a la ruta secundaria
        Copy-Item -Path $PRIMARY_FILE -Destination $SECONDARY_FILE -Force
        Write-Host "Copia creada en: $SECONDARY_FILE" -ForegroundColor Green
        Write-Log "Archivo secundario: $SECONDARY_FILE" $PRIMARY_LOG
        Write-Log "Copia realizada: SI" $PRIMARY_LOG
        
        # Log en archivo secundario
        Write-Log "=========================================" $SECONDARY_LOG
        Write-Log "INICIO DEL PROCESO DE RESPALDO" $SECONDARY_LOG
        Write-Log "Base de datos: $DB_NAME" $SECONDARY_LOG
        Write-Log "ESTADO: EXITOSO" $SECONDARY_LOG
        Write-Log "Archivo: $BACKUP_FILE" $SECONDARY_LOG
        Write-Log "Tamano: $FILE_SIZE_STR" $SECONDARY_LOG
        
        Write-Host "Tamano del respaldo: $FILE_SIZE_STR" -ForegroundColor Yellow
    } else {
        Write-Host "Error al crear el respaldo" -ForegroundColor Red
        Write-Log "ESTADO: FALLIDO - Codigo de error: $LASTEXITCODE" $PRIMARY_LOG
        Write-Log "Error: pg_dump retorno codigo $LASTEXITCODE" $PRIMARY_LOG
        
        Write-Log "=========================================" $SECONDARY_LOG
        Write-Log "INICIO DEL PROCESO DE RESPALDO" $SECONDARY_LOG
        Write-Log "ESTADO: FALLIDO" $SECONDARY_LOG
        Write-Log "Error: pg_dump retorno codigo $LASTEXITCODE" $SECONDARY_LOG
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Log "ESTADO: FALLIDO - Excepcion" $PRIMARY_LOG
    Write-Log "Error: $_" $PRIMARY_LOG
    
    Write-Log "=========================================" $SECONDARY_LOG
    Write-Log "INICIO DEL PROCESO DE RESPALDO" $SECONDARY_LOG
    Write-Log "ESTADO: FALLIDO" $SECONDARY_LOG
    Write-Log "Error: $_" $SECONDARY_LOG
}

# Eliminar respaldos mayores a 14 dias
Write-Host "Eliminando respaldos mayores a 14 dias..." -ForegroundColor Cyan
Write-Log "--- LIMPIEZA DE RESPALDOS ANTIGUOS ---" $PRIMARY_LOG

$DAYS_TO_KEEP = 14
$CUTOFF_DATE = (Get-Date).AddDays(-$DAYS_TO_KEEP)
$ELIMINADOS_PRIMARIOS = 0
$ELIMINADOS_SECUNDARIOS = 0

# Limpiar en ruta primaria
Get-ChildItem -Path $PRIMARY_BACKUP_PATH -Filter "printlab_*.sql" | Where-Object { $_.LastWriteTime -lt $CUTOFF_DATE } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Eliminado: $($_.Name)" -ForegroundColor Yellow
    Write-Log "Eliminado primario: $($_.Name)" $PRIMARY_LOG
    $ELIMINADOS_PRIMARIOS++
}

# Limpiar en ruta secundaria
Get-ChildItem -Path $SECONDARY_BACKUP_PATH -Filter "printlab_*.sql" | Where-Object { $_.LastWriteTime -lt $CUTOFF_DATE } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Eliminado: $($_.Name)" -ForegroundColor Yellow
    Write-Log "Eliminado secundario: $($_.Name)" $PRIMARY_LOG
    $ELIMINADOS_SECUNDARIOS++
}

# Limpiar variable de entorno
Remove-Item Env:\PGPASSWORD

# Contar respaldos actuales
$TOTAL_PRIMARIOS = (Get-ChildItem -Path $PRIMARY_BACKUP_PATH -Filter "printlab_*.sql" -ErrorAction SilentlyContinue).Count
$TOTAL_SECUNDARIOS = (Get-ChildItem -Path $SECONDARY_BACKUP_PATH -Filter "printlab_*.sql" -ErrorAction SilentlyContinue).Count

Write-Log "Respaldos eliminados primaria: $ELIMINADOS_PRIMARIOS" $PRIMARY_LOG
Write-Log "Respaldos eliminados secundaria: $ELIMINADOS_SECUNDARIOS" $PRIMARY_LOG
Write-Log "Total respaldos primaria: $TOTAL_PRIMARIOS" $PRIMARY_LOG
Write-Log "Total respaldos secundaria: $TOTAL_SECUNDARIOS" $PRIMARY_LOG
Write-Log "FIN DEL PROCESO DE RESPALDO" $PRIMARY_LOG
Write-Log "=========================================" $PRIMARY_LOG

Write-Log "Respaldos eliminados: $ELIMINADOS_SECUNDARIOS" $SECONDARY_LOG
Write-Log "Total respaldos: $TOTAL_SECUNDARIOS" $SECONDARY_LOG
Write-Log "FIN DEL PROCESO DE RESPALDO" $SECONDARY_LOG
Write-Log "=========================================" $SECONDARY_LOG

Write-Host "Respaldos en ruta primaria: $TOTAL_PRIMARIOS" -ForegroundColor Green
Write-Host "Respaldos en ruta secundaria: $TOTAL_SECUNDARIOS" -ForegroundColor Green

Write-Host "Proceso completado" -ForegroundColor Cyan