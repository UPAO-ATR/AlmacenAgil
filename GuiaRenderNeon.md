El despliegue remoto utiliza un único servicio Docker en Render y PostgreSQL administrado en Neon.

Arquitectura

text
Navegador
  ↓ HTTPS
Render
  ├ Nginx
  ├ React compilado
  └ Servidor Node.js
          ↓ TLS verificado
      Neon PostgreSQL


1. Crear la base en Neon

1. Crea un proyecto llamado “AlmacenAgil”.
2. Pulsa “Connect”.
3. Activa “Connection pooling”.
4. Muestra la contraseña y copia la cadena completa.
5. Confirma que el host contiene “-pooler”.

El servidor normaliza la conexión de Neon a “sslmode=verify-full” antes de crear el pool.

No ejecutes manualmente “Inicial.sql”. El servidor aplica el esquema de forma idempotente al iniciar y conserva los registros existentes.

2. Preparar contraseñas

Ejecuta localmente una sola vez:

bash
./PrepararEntorno.sh


Guarda estos valores sin subir “.env”:

text
CLAVEADMINISTRADOR
CLAVEADMINRESPALDO
CLAVEVENTAS
CLAVEALMACEN


La cuenta de recuperación es:

text
respaldo@almacenagil.pe


3. Subir a GitHub

Comprueba:

bash
git check-ignore .env
git status


“.env” debe permanecer fuera del repositorio.

4. Crear el servicio en Render

1. Selecciona “New” y luego “Blueprint”.
2. Conecta el repositorio.
3. Render detectará “render.yaml”.
4. Completa:
   - “URLBASE”.
   - “CLAVEADMINISTRADOR”.
   - “CLAVEADMINRESPALDO”.
   - “CLAVEVENTAS”.
   - “CLAVEALMACEN”.
5. Confirma el plan gratuito y crea el Blueprint.

“SECRETOACCESO” se genera automáticamente.

5. Correo opcional

Sin SMTP, la creación de un trabajador sigue funcionando: el administrador recibe el código y la contraseña temporal en una ventana protegida.

Para envío real configura en Render:

text
SERVIDORCORREO
PUERTOCORREO
CORREOSEGURIDAD
USUARIOCORREO
CLAVECORREO
REMITENTECORREO


Si el envío falla, el sistema conserva la notificación y muestra las credenciales al administrador para entrega manual.

6. Comprobación

text
https://nombre-del-servicio.onrender.com/api/salud


Respuesta esperada:

json
{"estado":"operativo"}


Portal:

text
https://nombre-del-servicio.onrender.com/?portal=1


7. Recuperación administrativa

Si la cuenta principal queda bloqueada:

1. Ingresa con “respaldo@almacenagil.pe”.
2. Abre “Trabajadores”.
3. Pulsa “Desbloquear acceso”.

La cuenta de recuperación se reactiva y sincroniza con “CLAVEADMINRESPALDO” cada vez que el servicio inicia.

8. Actualizaciones

Cada despliegue vuelve a ejecutar la migración idempotente. Las nuevas columnas, filtros y descuentos se agregan sin borrar trabajadores, cotizaciones ni inventario.

9. A+

Escanea el dominio raíz en MDN HTTP Observatory. La imagen conserva CSP, HSTS, “nosniff”, protección contra marcos, CORP, COOP, políticas de permisos y redirección a HTTPS.

10. Suspensión gratuita

Nota de Gamba: Render puede suspender el servicio por inactividad. Neon conserva los datos.