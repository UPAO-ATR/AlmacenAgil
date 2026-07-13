Aplicación web de gestión comercial y logística para catálogo, cotizaciones, verificación de pagos, preparación de pedidos, inventario, reabastecimiento, proveedores, compras, recepciones, auditorías y trabajadores.

Funciones principales
1. Catálogo público y carrito sin líneas duplicadas.
2. Cotización validada en frontend, backend y PostgreSQL.
3. Contacto y comprobante gestionados por ventas.
4. Verificación del pago por administración.
5. Reserva transaccional del stock.
6. Reabastecimiento automático y ranking de proveedores.
7. Recepción con faltantes, defectuosos y actualización de existencias.
8. Auditorías de inventario y trazabilidad de acciones.
9. Cuentas por roles y revocación inmediata de sesiones.
10. Cuenta administrativa protegida para recuperación.

Desarrollo local
Genera “.env” una sola vez:

bash
./PrepararEntorno.sh


Inicia:
bash
docker compose config --quiet
docker compose build servidor
docker compose build aplicacion
docker compose up -d


Web:
text
http://127.0.0.1:8080


Portal:
text
http://127.0.0.1:8080/?portal=1


Usuarios iniciales
text
administrador@almacenagil.pe
respaldo@almacenagil.pe
ventas@almacenagil.pe
almacen@almacenagil.pe

Las contraseñas se generan en “.env”. La cuenta “respaldo@almacenagil.pe” está protegida contra bloqueo desde el panel y permite recuperar otras cuentas administrativas.

Render y Neon
La versión lista para publicación incluye:
- “DockerfileRender”
- “render.yaml”
- “Render/InicioRender.sh”
- “Render/nginx.conf.template”
- Inicialización automática e idempotente del esquema en Neon

Consulta “GuiaRenderNeon.md”.
Seguridad
- CSP restrictiva sin “unsafe-inline” ni “unsafe-eval”.
- HSTS, “nosniff”, protección contra marcos, CORP y COOP.
- Cookies “HttpOnly”, “Secure” en producción y “SameSite=Strict”.
- Protección de origen y token de sesión para operaciones de escritura.
- Consultas parametrizadas y transacciones con bloqueo de filas.
- Límites de solicitudes, tamaño, tiempo y conexiones.
- Validación binaria de comprobantes e imágenes.
- Roles comprobados en backend.
- Auditoría de operaciones y revocación de sesiones.

Pruebas
bash
docker compose run --rm servidor npm run probar