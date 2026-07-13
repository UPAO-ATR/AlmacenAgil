#!/bin/sh
set -eu

node /aplicacion/Servidor/src/Indice.js &
ProcesoServidor=$!

nginx -g 'daemon off;' &
ProcesoNginx=$!

cerrar() {
  kill -TERM "$ProcesoServidor" "$ProcesoNginx" 2>/dev/null || true
  wait "$ProcesoServidor" "$ProcesoNginx" 2>/dev/null || true
}

trap cerrar TERM INT

while kill -0 "$ProcesoServidor" 2>/dev/null && kill -0 "$ProcesoNginx" 2>/dev/null; do
  sleep 2
done

cerrar
exit 1