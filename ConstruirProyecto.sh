#!/bin/sh
set -eu

docker compose config --quiet
docker compose build servidor
docker compose build aplicacion
docker compose up -d
docker compose ps