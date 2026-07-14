Catálogo y filtros

1. Filtrar por tipo de producto.
2. Confirmar que Material solo muestre valores disponibles para el tipo elegido.
3. Aplicar Grosor y Dimensiones de forma progresiva.
4. Limpiar todos los filtros.
5. Buscar por nombre, código y material.

Descuentos y límites

1. Pedir 4 unidades y comprobar 0 % de volumen.
2. Pedir 5 y 10 unidades y comprobar 10 %.
3. Pedir 11 y 20 unidades y comprobar 15 %.
4. Pedir 21 unidades y comprobar 20 %.
5. Configurar un descuento fijo y comprobar que se suma al de volumen.
6. Intentar superar el máximo por pedido desde el navegador y mediante una solicitud manual.
7. Confirmar que el backend recalcula el total sin aceptar descuentos enviados por el cliente.

Cliente

1. Agregar dos veces el mismo producto y comprobar que solo aumenta la cantidad.
2. Intentar DNI con letras, siete dígitos y nueve dígitos.
3. Intentar RUC con diez y doce dígitos.
4. Intentar correo y teléfono inválidos.
5. Enviar una cotización válida y verificar el detalle y los descuentos en el portal.

Ventas y pago

1. Confirmar que el asesor solo puede registrar contacto en Pendiente.
2. Confirmar que solo puede adjuntar pago después del contacto.
3. Probar PDF, PNG, JPG o WEBP válido.
4. Probar archivo renombrado con firma falsa y tamaño superior al límite.
5. Confirmar que solo el administrador aprueba el pago.
6. Rechazar un pago y volver a adjuntar un comprobante.

Proveedores

1. Vincular un producto con precio habitual y descuento de lanzamiento.
2. Comprobar el precio efectivo.
3. Confirmar que el ranking usa el precio efectivo.
4. Verificar que el resto de la fórmula conserva 40/20/10/30.

Stock y concurrencia

1. Aprobar dos cotizaciones que consuman el mismo producto.
2. Confirmar que el stock reservado nunca supera el stock actual.
3. Confirmar que una cotización superior al stock genera reabastecimiento.
4. Intentar un movimiento que reduzca el stock debajo de las reservas.

Recepción y auditoría

1. Registrar una recepción completa.
2. Registrar otra con faltantes y defectuosos.
3. Intentar cantidades cuya suma no coincida con la orden.
4. Comprobar que solo las unidades buenas aumentan stock.
5. Registrar una auditoría con ajuste y merma.

Usuarios y correo

1. Crear un trabajador con SMTP desactivado.
2. Confirmar que se muestran correo, código, contraseña temporal y vencimiento.
3. Activar la cuenta con esas credenciales.
4. Generar credenciales nuevas y comprobar que las anteriores dejan de servir.
5. Con SMTP configurado, confirmar que el correo se envía y las credenciales no se exponen en producción.
6. Fallar cinco accesos y comprobar bloqueo temporal.
7. Bloquear una sesión activa desde otra cuenta y repetir una operación.

Seguridad

1. Intentar rutas administrativas con asesor y jefe de almacén.
2. Enviar JSON malformado, campos adicionales y cuerpo superior a 2 MB.
3. Probar inyección SQL en acceso y formularios.
4. Probar texto HTML y confirmar que no se ejecuta.
5. Verificar encabezados con MDN HTTP Observatory después de publicar.