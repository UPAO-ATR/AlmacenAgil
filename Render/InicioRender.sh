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

echo "Iniciando Nginx en ${PuertoPublico}"
nginx -g 'daemon off;' &
ProcesoNginx=$!

cerrar() {
  echo "Cerrando servicios"
  kill -TERM "$ProcesoServidor" "$ProcesoNginx" 2>/dev/null || true
  wait "$ProcesoServidor" "$ProcesoNginx" 2>/dev/null || true
}

trap cerrar TERM INT

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
