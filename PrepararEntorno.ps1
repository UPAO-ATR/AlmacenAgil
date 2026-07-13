if (Test-Path ".env") {
    Write-Host "El archivo .env ya existe"
    exit 1
}

function GenerarHex([int]$Cantidad) {
    $Bytes = New-Object byte[] $Cantidad
    $Generador = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $Generador.GetBytes($Bytes)
    $Generador.Dispose()
    return -join ($Bytes | ForEach-Object { $_.ToString("x2") })
}

$ClaveAdministrador = "Aa!$(GenerarHex 14)"
$ClaveAdminRespaldo = "Respaldo!$(GenerarHex 8)Aa7"
$ClaveVentas = "Vv!$(GenerarHex 14)"
$ClaveAlmacen = "Jj!$(GenerarHex 14)"

@"
ENTORNO=desarrollo
CLAVEPOSTGRES=$(GenerarHex 32)
SECRETOACCESO=$(GenerarHex 64)
CLAVEADMINISTRADOR=$ClaveAdministrador
CLAVEADMINRESPALDO=$ClaveAdminRespaldo
CLAVEVENTAS=$ClaveVentas
CLAVEALMACEN=$ClaveAlmacen
SERVIDORCORREO=
PUERTOCORREO=587
CORREOSEGURIDAD=false
USUARIOCORREO=
CLAVECORREO=
REMITENTECORREO=noresponder@almacenagil.local
"@ | Set-Content -Encoding ascii .env

Write-Host "Entorno preparado"
Write-Host "Administrador: administrador@almacenagil.pe"
Write-Host "Clave: $ClaveAdministrador"
Write-Host "Administrador de respaldo: respaldo@almacenagil.pe"
Write-Host "Clave: $ClaveAdminRespaldo"
Write-Host "Asesor: ventas@almacenagil.pe"
Write-Host "Clave: $ClaveVentas"
Write-Host "Almacén: almacen@almacenagil.pe"
Write-Host "Clave: $ClaveAlmacen"