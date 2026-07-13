 Cliente
1. Agregar dos veces el mismo producto y comprobar que solo aumenta la cantidad.
2. Intentar DNI con letras, siete dígitos y nueve dígitos.
3. Intentar RUC con diez y doce dígitos.
4. Intentar correo, teléfono y cantidades inválidos.
5. Enviar una cotización válida y verificar su detalle en el portal.

 Ventas y pago
1. Confirmar que el asesor solo puede registrar contacto en Pendiente.
2. Confirmar que solo puede adjuntar pago después del contacto.
3. Probar PDF, PNG, JPG o WEBP válido.
4. Probar archivo renombrado con firma falsa y tamaño superior al límite.
5. Confirmar que solo el administrador aprueba el pago.
6. Rechazar un pago y volver a adjuntar un comprobante.

 Stock y concurrencia
1. Aprobar dos cotizaciones que consuman el mismo producto.
2. Confirmar que el stock reservado nunca supera el stock actual.
3. Confirmar que la segunda cotización genera reabastecimiento si no hay disponibilidad.
4. Intentar un movimiento que reduzca el stock debajo de las reservas.

 Reabastecimiento
1. Confirmar solicitudes por stock mínimo, mensual y faltante de cotización.
2. Verificar que solo aparecen proveedores que venden el producto.
3. Recalcular manualmente la fórmula 40/20/10/30.
4. Crear un empate y confirmar que ambos aparecen como mejores.
5. Seleccionar proveedor, adjuntar voucher y comprobar el estado EnTransito.

 Recepción y auditoría
1. Registrar una recepción completa.
2. Registrar otra con faltantes y defectuosos.
3. Intentar cantidades cuya suma no coincida con la orden.
4. Comprobar que solo las unidades buenas aumentan stock.
5. Comprobar que observaciones generan una nueva solicitud.
6. Registrar una auditoría con ajuste y merma.
7. Intentar conteo menor al stock reservado.

 Usuarios y seguridad
1. Crear trabajador y activar con código, clave temporal y clave nueva.
2. Probar código vencido, incorrecto y reutilizado.
3. Fallar cinco accesos y comprobar bloqueo temporal.
4. Iniciar sesión, bloquear al usuario desde otra cuenta y repetir una operación.
5. Cambiar contraseña y comprobar que la sesión anterior queda revocada.
6. Intentar rutas administrativas con asesor y jefe de almacén.
7. Enviar JSON malformado, campos adicionales y cuerpo superior a 2 MB.
8. Verificar encabezados con MDN HTTP Observatory después de publicar.