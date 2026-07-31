#Requires -Version 5.1
<#
.SYNOPSIS
    Script de respaldo del proyecto PrintLab
.DESCRIPTION
    Crea un respaldo ZIP del proyecto excluyendo node_modules, .git y archivos temporales.
    Mantiene un historial de 14 dias de respaldos.
.NOTES
    Autor: PrintLab
    Uso: .\scripts\backup.ps1
#>

param(
    [string]$RutaOrigen = "E:\Github\PrintLab",
    [string]$RutaDestino = "E:\Respaldo Github\PrintLab\Proyecto",
    [int]$DiasHistorial = 14
)

$ErrorActionPreference = "Stop"

$Fecha = Get-Date -Format "yyyyMMdd-HHmmss"
$NombreArchivo = "PrintLab_$Fecha.zip"
$RutaCompletaZip = Join-Path $RutaDestino $NombreArchivo

$CarpetasExcluidas = @(
    "node_modules",
    ".git",
    ".vs",
    "backups",
    "logs"
)

$ArchivosExcluidos = @(
    "*.log"
)

try {
    if (-not (Test-Path $RutaDestino)) {
        New-Item -ItemType Directory -Path $RutaDestino -Force | Out-Null
        Write-Host "[OK] Directorio de destino creado: $RutaDestino" -ForegroundColor Green
    }

    $tempDir = Join-Path $env:TEMP "PrintLab_Backup_$Fecha"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    Write-Host "Preparando respaldo de: $RutaOrigen" -ForegroundColor Cyan
    Write-Host "Destino: $RutaCompletaZip" -ForegroundColor Cyan
    Write-Host ""

    $items = Get-ChildItem -Path $RutaOrigen -Force | Where-Object {
        $excluir = $false
        foreach ($carpeta in $CarpetasExcluidas) {
            if ($_.Name -eq $carpeta) { $excluir = $true; break }
        }
        if (-not $excluir -and $_.PSIsContainer -eq $false) {
            foreach ($patron in $ArchivosExcluidos) {
                if ($_.Name -like $patron) { $excluir = $true; break }
            }
        }
        return (-not $excluir)
    }

    foreach ($item in $items) {
        $destinoItem = Join-Path $tempDir $item.Name
        if ($item.PSIsContainer) {
            Copy-Item -Path $item.FullName -Destination $destinoItem -Recurse -Force
            Write-Host "  [COPY] $($item.Name)/" -ForegroundColor Gray
        } else {
            Copy-Item -Path $item.FullName -Destination $destinoItem -Force
            Write-Host "  [COPY] $($item.Name)" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "Comprimiendo respaldo..." -ForegroundColor Yellow
    Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $RutaCompletaZip -CompressionLevel Optimal -Force

    $tamano = (Get-Item $RutaCompletaZip).Length / 1MB
    Write-Host ("[OK] Respaldo creado: $NombreArchivo ({0:N2} MB)" -f $tamano) -ForegroundColor Green

    Write-Host ""
    Write-Host "Limpiando respaldos mayores a $DiasHistorial dias..." -ForegroundColor Yellow
    $limiteFecha = (Get-Date).AddDays(-$DiasHistorial)
    $respaldosAntiguos = Get-ChildItem -Path $RutaDestino -Filter "PrintLab_*.zip" -File | Where-Object {
        $_.CreationTime -lt $limiteFecha
    }

    if ($respaldosAntiguos.Count -gt 0) {
        foreach ($antiguo in $respaldosAntiguos) {
            Remove-Item -Path $antiguo.FullName -Force
            Write-Host "  [DEL] $($antiguo.Name)" -ForegroundColor Red
        }
        Write-Host "[OK] $($respaldosAntiguos.Count) respaldo(s) antiguo(s) eliminado(s)" -ForegroundColor Green
    } else {
        Write-Host "[OK] No hay respaldos antiguos para eliminar" -ForegroundColor Green
    }

    Write-Host ""
    $totalRespaldos = (Get-ChildItem -Path $RutaDestino -Filter "PrintLab_*.zip" -File).Count
    Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
    Write-Host "  Respaldo actual: $NombreArchivo" -ForegroundColor White
    Write-Host ("  Tamano: {0:N2} MB" -f $tamano) -ForegroundColor White
    Write-Host "  Total respaldos en destino: $totalRespaldos" -ForegroundColor White
    Write-Host "  Historial mantenido: $DiasHistorial dias" -ForegroundColor White
    Write-Host "  Ruta: $RutaCompletaZip" -ForegroundColor White
    Write-Host ""
    Write-Host "Respaldo completado exitosamente." -ForegroundColor Green

} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
