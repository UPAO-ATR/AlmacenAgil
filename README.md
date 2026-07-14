Software web de gestión comercial y logística para catálogo, cotizaciones, verificación de pagos, preparación de pedidos, inventario, reabastecimiento, proveedores, compras, recepciones, auditorías y trabajadores.

Funciones principales

1. Catálogo público con filtros por tipo de producto, material, grosor y dimensiones.
2. Carrito sin líneas duplicadas y límite configurable por producto.
3. Descuentos fijos y descuentos por volumen calculados nuevamente en el backend.
4. Cotización validada en frontend, backend y PostgreSQL.
5. Contacto y comprobante gestionados por ventas.
6. Verificación del pago por administración.
7. Reserva transaccional del stock y reabastecimiento de faltantes.
8. Ranking de proveedores con precio efectivo, tiempo, historial y evaluación.
9. Descuentos de lanzamiento configurables por proveedor y producto.
10. Recepción con faltantes, defectuosos y actualización de existencias.
11. Auditorías de inventario y trazabilidad de acciones.
12. Cuentas por roles, activación con credenciales temporales y revocación inmediata de sesiones.
13. Cuenta administrativa protegida para recuperación.

Descuentos para clientes

El descuento se aplica por cada línea del pedido:

- 1 a 4 unidades: 0 % por volumen.
- 5 a 10 unidades: 10 %.
- 11 a 20 unidades: 15 %.
- 21 unidades o más: 20 %.

El descuento fijo configurado en el producto se suma al descuento por volumen. El backend ignora porcentajes enviados por el navegador y calcula nuevamente el total.

Desarrollo local

Genera .env una sola vez:

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


Las contraseñas se generan en .env. La cuenta respaldo@almacenagil.pe está protegida contra bloqueo desde el panel y permite recuperar otras cuentas administrativas.

Activación de trabajadores

Cuando SMTP está configurado, el código y la contraseña temporal se envían al correo del trabajador. Cuando el correo no está configurado o falla, el administrador recibe una ventana protegida con las credenciales para entregarlas manualmente. Las credenciales solo se muestran en esa respuesta y la base almacena hashes.

Render y Neon

La versión lista para publicación incluye:

- DockerfileRender.
- render.yaml.
- Render/InicioRender.sh.
- Render/nginx.conf.template.
- Inicialización automática e idempotente del esquema en Neon.

Consulta GuiaRenderNeon.md.

Seguridad

- CSP restrictiva sin unsafe-inline ni unsafe-eval.
- HSTS, nosniff, protección contra marcos, CORP y COOP.
- Cookies HttpOnly, Secure en producción y SameSite=Strict.
- Protección de origen y token de sesión para operaciones de escritura.
- Consultas parametrizadas y transacciones con bloqueo de filas.
- Límites de solicitudes, tamaño, tiempo y conexiones.
- Validación binaria de comprobantes e imágenes.
- Validación de límites y descuentos en backend y PostgreSQL.
- Roles comprobados en backend.
- Auditoría de operaciones y revocación de sesiones.
- TLS con verificación completa para conexiones a Neon.

Pruebas

bash
cd Servidor
npm ci
npm test


bash
cd Aplicacion
npm ci
npm run construir