Para alojar la aplicación sin depender de una computadora encendida se me ha solicitado hacerlo Render y Neon siguiendo:

text
GuiaRenderNeon.md
El despliegue remoto conserva el frontend y la API bajo el mismo dominio, inicia automáticamente el esquema PostgreSQL y mantiene las cabeceras de seguridad.

 Respaldo local
Genera “.env” una sola vez:

bash
./PrepararEntorno.sh

Inicia:

bash
docker compose config --quiet
docker compose build servidor
docker compose build aplicacion
docker compose up -d


Abre:
text
http://127.0.0.1:8080


Portal:
text
http://127.0.0.1:8080/?portal=1


No publiques los puertos 3000 ni 5432. No subas “.env” al repositorio.
 Pruebas

bash
docker compose run --rm servidor npm run probar


Consulta también:
- “PruebasFuncionales.md”
- “BlindajeWeb.md”
- “VerificacionRenderNeon.md”

 Respaldo local de PostgreSQL
bash
mkdir -p Respaldos
docker compose exec -T basedatos pg_dump -U almacenagil almacenagil > Respaldos/Respaldo.sql


Nota de Gamba: No ejecutes por nada del mundo “docker compose down -v” cuando existan datos que debas conservar.