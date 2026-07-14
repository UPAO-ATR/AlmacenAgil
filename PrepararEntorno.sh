#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  echo "El archivo .env ya existe"
  exit 1
fi

generarhex() {
  openssl rand -hex "$1"
}

claveadministrador="Aa!$(generarhex 14)"
claveadminrespaldo="Respaldo!$(generarhex 8)Aa7"
claveventas="Vv!$(generarhex 14)"
clavealmacen="Jj!$(generarhex 14)"

cat > .env <<ARCHIVO
ENTORNO=desarrollo
CLAVEPOSTGRES=$(generarhex 32)
SECRETOACCESO=$(generarhex 64)
CLAVEADMINISTRADOR=${claveadministrador}
CLAVEADMINRESPALDO=${claveadminrespaldo}
CLAVEVENTAS=${claveventas}
CLAVEALMACEN=${clavealmacen}
SERVIDORCORREO=
PUERTOCORREO=587
CORREOSEGURIDAD=false
USUARIOCORREO=
CLAVECORREO=
REMITENTECORREO=noresponder@almacenagil.local
ARCHIVO

chmod 600 .env 2>/dev/null || true

echo "Entorno preparado"
echo "Administrador: administrador@almacenagil.pe"
echo "Clave: ${claveadministrador}"
echo "Administrador de respaldo: respaldo@almacenagil.pe"
echo "Clave: ${claveadminrespaldo}"
echo "Asesor: ventas@almacenagil.pe"
echo "Clave: ${claveventas}"
echo "Almacén: almacen@almacenagil.pe"
echo "Clave: ${clavealmacen}"