Frontend
- React escapa texto de usuarios y datos comerciales.
- No se usa “dangerouslySetInnerHTML”, “eval” ni JavaScript en línea.
- CSP bloquea scripts, estilos, marcos, objetos y formularios externos.
- Las imágenes solo pueden ser archivos PNG, JPG o WEBP convertidos a datos locales.
- Los formularios filtran caracteres, longitudes, rangos y formatos antes de enviar.
- El frontend nunca decide permisos ni precios definitivos.

Backend
- Validación estricta con Zod y rechazo de campos adicionales.
- Consultas PostgreSQL parametrizadas.
- Transacciones y bloqueos “FOR UPDATE” para pagos, reservas, recepciones y auditorías.
- Autorización por rol en cada ruta sensible.
- Sesiones JWT firmadas, con emisor, audiencia, algoritmo fijo y vencimiento.
- Cookie HttpOnly, SameSite estricta y Secure en producción.
- Protección CSRF con token de sesión y verificación de origen.
- Revocación inmediata al bloquear un usuario o cambiar su contraseña.
- Bloqueo temporal de cuenta tras cinco intentos fallidos.
- Contraseñas protegidas con bcrypt.
- Códigos de verificación protegidos con bcrypt y vencimiento.
- Archivos limitados por tamaño, MIME permitido y firma binaria real.
- Archivos servidos como descarga y con “nosniff”.
- Registro de acciones sensibles con usuario, entidad, fecha e IP.
- Errores internos no exponen consultas, rutas ni trazas.

Infraestructura
- PostgreSQL no publica puertos.
- Nginx es la única puerta de entrada y escucha solo en “127.0.0.1”.
- Cloudflare Tunnel evita abrir puertos del router y oculta el origen.
- Límites de solicitudes, accesos, conexiones, cuerpos y tiempos de espera.
- Contenedores sin privilegios, capacidades eliminadas y archivos de solo lectura.
- Límites de CPU, memoria, procesos y rotación de registros.
- HSTS, CSP, “nosniff”, protección contra marcos, política de referencia, CORP y COOP.
- “TRACE” y “CONNECT” bloqueados.

Alcance
El sistema está preparado para abuso intermedio, fuerza bruta, manipulación de formularios, inyección, intentos de acceso por rol y ráfagas automatizadas. No obstante, debo aclarar que proyecto gratuito garantiza disponibilidad frente a un ataque distribuido profesional o frente a la caída del equipo o de Internet, por eso es muy importante invertir en seguridad y en buenos programadores.