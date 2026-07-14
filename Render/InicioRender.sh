#!/bin/sh

set -eu

PuertoPublico="${PORT:-10000}"
PuertoServidor="${PUERTO:-3000}"

export PORT="$PuertoPublico"
export PUERTO="$PuertoServidor"

echo "Configurando Nginx en 0.0.0.0:${PuertoPublico}"

envsubst '${PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

sed -i \
  "s/listen[[:space:]]*${PuertoPublico};/listen 0.0.0.0:${PuertoPublico};/" \
  /etc/nginx/conf.d/default.conf

echo "Validando Nginx"
nginx -t

echo "Iniciando servidor Node en ${PuertoServidor}"
node /aplicacion/Servidor/src/Indice.js &
ProcesoServidor=$!

cerrar() {
  echo "Cerrando servicios"

  if [ -n "${ProcesoNginx:-}" ]; then
    kill -TERM "$ProcesoNginx" 2>/dev/null || true
  fi

  kill -TERM "$ProcesoServidor" 2>/dev/null || true

  if [ -n "${ProcesoNginx:-}" ]; then
    wait "$ProcesoNginx" 2>/dev/null || true
  fi

  wait "$ProcesoServidor" 2>/dev/null || true
}

trap cerrar TERM INT

echo "Esperando inicialización del servidor"

ServidorListo=false
Intento=1

while [ "$Intento" -le 90 ]; do
  if ! kill -0 "$ProcesoServidor" 2>/dev/null; then
    echo "El servidor Node se detuvo durante la inicialización"
    wait "$ProcesoServidor" || true
    exit 1
  fi

  if wget -q -T 2 -O /dev/null \
    "http://127.0.0.1:${PuertoServidor}/api/salud"; then
    ServidorListo=true
    break
  fi

  echo "Servidor todavía no disponible: intento ${Intento} de 90"
  Intento=$((Intento + 1))
  sleep 2
done

if [ "$ServidorListo" != "true" ]; then
  echo "El servidor no estuvo disponible después de 180 segundos"
  cerrar
  exit 1
fi

echo "Servidor Node disponible"
echo "Iniciando Nginx en ${PuertoPublico}"

nginx -g 'daemon off;' &
ProcesoNginx=$!

while true; do
  if ! kill -0 "$ProcesoServidor" 2>/dev/null; then
    echo "El servidor Node se detuvo"
    wait "$ProcesoServidor" || true
    cerrar
    exit 1
  fi

  if ! kill -0 "$ProcesoNginx" 2>/dev/null; then
    echo "Nginx se detuvo"
    wait "$ProcesoNginx" || true
    cerrar
    exit 1
  fi

  sleep 2
done