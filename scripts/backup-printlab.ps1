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

# Fecha para el nombre del archivo
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BACKUP_FILE = "printlab_$DATE.sql"

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

try {
    & "$PG_BIN\pg_dump.exe" -U $DB_USER -d $DB_NAME -F p -f $PRIMARY_FILE 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Respaldo creado exitosamente en: $PRIMARY_FILE" -ForegroundColor Green
        
        # Copiar a la ruta secundaria
        Copy-Item -Path $PRIMARY_FILE -Destination $SECONDARY_FILE -Force
        Write-Host "Copia creada en: $SECONDARY_FILE" -ForegroundColor Green
        
        # Mostrar tamaño del archivo
        $FILE_SIZE = (Get-Item $PRIMARY_FILE).Length / 1MB
        Write-Host "Tamano del respaldo: $([math]::Round($FILE_SIZE, 2)) MB" -ForegroundColor Yellow
    } else {
        Write-Host "Error al crear el respaldo" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Limpiar variable de entorno
Remove-Item Env:\PGPASSWORD

Write-Host "Proceso completado" -ForegroundColor Cyan