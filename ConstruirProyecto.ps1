$ErrorActionPreference = "Stop"

docker compose config --quiet
docker compose build servidor
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose build aplicacion
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose ps