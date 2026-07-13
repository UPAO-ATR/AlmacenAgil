El despliegue remoto utiliza un único servicio Docker en Render y PostgreSQL administrado en Neon.

 Arquitectura

text
Navegador
  ↓ HTTPS
Render
  ├ Nginx
  ├ React compilado
  └ Servidor Node.js
          ↓ TLS
      Neon PostgreSQL


 1. Crear la base en Neon

1. Crea una cuenta gratuita en Neon.
2. Crea un proyecto llamado “AlmacenAgil”.
3. Pulsa “Connect”.
4. Selecciona la cadena agrupada, cuyo host contiene “-pooler”.
5. Copia la cadena completa con “sslmode=require”.

Nota de Gamba: No necesitas ejecutar manualmente “Inicial.sql”. El servidor aplica el esquema de forma idempotente al iniciar.

 2. Preparar las contraseñas

Ejecuta localmente una sola vez:

bash
./PrepararEntorno.sh


Nota de Gamba: Debes guardar los valores de estas variables sin subir “.env” al repositorio:

text
CLAVEADMINISTRADOR
CLAVEADMINRESPALDO
CLAVEVENTAS
CLAVEALMACEN


La cuenta de recuperación es:

text
respaldo@almacenagil.pe


El preparador usa un formato más fácil de transcribir. La cuenta no se puede bloquear desde el panel.

 3. Subir a GitHub

Comprueba primero:

bash
git check-ignore .env
git status


“.env” debe permanecer fuera del repositorio.

 4. Crear el servicio en Render

1. En Render selecciona “New” y luego “Blueprint”.
2. Conecta el repositorio.
3. Render detectará “render.yaml”.
4. Completa las variables solicitadas:
   - “URLBASE”: cadena agrupada de Neon.
   - “CLAVEADMINISTRADOR”.
   - “CLAVEADMINRESPALDO”.
   - “CLAVEVENTAS”.
   - “CLAVEALMACEN”.
5. Confirma el plan gratuito y crea el Blueprint.

“SECRETOACCESO” se genera automáticamente en Render.

 5. Comprobación

Cuando el despliegue termine, abre:

text
https://nombre-del-servicio.onrender.com/api/salud


Debería responder:

json
{"estado":"operativo"}


Portal:

text
https://nombre-del-servicio.onrender.com/?portal=1


 6. A+

Escanea el dominio raíz en MDN HTTP Observatory. La imagen conserva CSP, HSTS, “nosniff”, protección contra marcos, CORP, COOP, políticas de permisos y redirección a HTTPS.

 7. Recuperación administrativa

Plan de contingencia de Gamba: Si la cuenta principal queda temporalmente bloqueada:

1. Ingresa con “respaldo@almacenagil.pe”.
2. Abre “Trabajadores”.
3. Pulsa “Desbloquear acceso” en la cuenta afectada.

La cuenta de recuperación se reactiva y sincroniza con “CLAVEADMINRESPALDO” cada vez que el servicio inicia. No uses una contraseña corta.

 8. Suspensión del plan gratuito

Render puede suspender el servicio después de un periodo sin solicitudes. Neon conserva los datos aunque el servicio web se suspenda.