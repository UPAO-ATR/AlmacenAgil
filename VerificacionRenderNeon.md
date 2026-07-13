Comprobaciones realizadas
- 15 pruebas automáticas del servidor aprobadas.
- Frontend compilado correctamente con Vite.
- Sintaxis JavaScript del servidor validada.
- Plantilla Nginx de Render validada con nginx -t después de sustituir PORT.
- render.yaml revisado contra la especificación oficial de Blueprints.
- Archivos package-lock.json sin direcciones de registros internos.
- .env, node_modules y archivos compilados excluidos del paquete final.
- Cuenta administrativa de recuperación protegida contra desactivación desde el panel.
- Inicialización de PostgreSQL idempotente y protegida con bloqueo transaccional.

Comprobaciones posteriores al despliegue
text
/api/salud responde 200
inicio de sesión con los cuatro usuarios iniciales
cuenta de recuperación visible como protegida
redirección HTTP a HTTPS
cookie SesionSegura con HttpOnly, Secure y SameSite Strict
MDN HTTP Observatory con A+