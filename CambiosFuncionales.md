Activación manual y reactivación

- El administrador puede activar manualmente una cuenta pendiente sin depender del correo.
- La activación manual genera una clave temporal válida por 30 minutos y obliga a cambiarla en el primer ingreso.
- Una cuenta desactivada puede reactivarse con una nueva clave temporal.
- Una clave temporal vencida puede renovarse desde Trabajadores.
- Se distinguen los estados Pendiente, Activo, Bloqueado, Desactivado y Cambio pendiente.
- La tabla indica si la activación fue por código, por administrador o corresponde a una cuenta inicial.
- Desactivar, reactivar, desbloquear y generar credenciales exigen confirmación explícita y quedan registradas en Trazabilidad.
- La cuenta de recuperación continúa protegida y no puede desactivarse ni reactivarse manualmente.

 Activación de trabajadores

- El envío por correo continúa disponible cuando SMTP está configurado.
- Si el correo no está configurado o falla, el administrador recibe el código, la contraseña temporal y el vencimiento en una ventana protegida.
- Las credenciales no se guardan en texto plano.
- El botón de reenvío se reemplazó por “Generar credenciales”.

 Clasificación de productos

Cada producto dispone de:

- Tipo de producto.
- Material.
- Grosor.
- Dimensiones.
- Máximo permitido por pedido.

El catálogo permite filtros progresivos y conserva el buscador original.

 Descuentos para clientes

- 5 a 10 unidades: 10 %.
- 11 a 20 unidades: 15 %.
- 21 unidades o más: 20 %.
- El descuento fijo del producto se suma al descuento por volumen.
- El servidor vuelve a calcular precios, descuentos y totales.

 Proveedores

- Cada vínculo entre proveedor y producto admite descuento de lanzamiento.
- El ranking usa el precio efectivo después de ese descuento.
- Se conserva la ponderación 40/20/10/30.

 Compatibilidad

- La migración es idempotente para Neon.
- Se conservan trabajadores, cotizaciones, inventario e historial.
- Se mantiene el despliegue actual de Render.
- Se mantienen las cabeceras y políticas de seguridad existentes.

 Límite general de stock

- Todo valor de inventario está limitado a 1000 unidades.
- Los campos numéricos impiden escribir o enviar cantidades superiores.
- El servidor rechaza valores manipulados desde el navegador.
- PostgreSQL impide guardar cantidades fuera del rango permitido.
- Los valores históricos de productos superiores a 1000 se normalizan al iniciar.

 Factura interna verificable

- Se genera automáticamente al registrar la entrega de una cotización.
- Incluye datos del emisor, cliente, productos, descuentos, total y trazabilidad.
- Produce un PDF con serie, correlativo, código, huella SHA-256 y QR.
- Puede verificarse desde una ruta pública sin revelar el documento completo del cliente.
- Los datos de emisión se administran desde Configuración.
- Es un documento interno no tributario y no reemplaza un comprobante SUNAT.