# FLUJO
## Compra del cliente
| Requisito | Implementación |
|---|---|
| Catálogo y carrito | Catálogo público, búsqueda, cantidades y carrito sin líneas duplicadas |
| Validaciones | DNI, RUC, teléfono, correo, cantidades, precios y límites en navegador, API y PostgreSQL |
| Cotización | Guarda cabecera, productos, precios, descuentos y total calculado por el servidor |
| Asesor recibe detalle | La pantalla muestra cliente, documento, contacto y cada producto solicitado |
| Contacto externo | El asesor registra fecha y nota del acuerdo realizado por llamada o correo |
| Comprobante del cliente | Admite PDF, PNG, JPG y WEBP, valida firma y tamaño, y lo entrega solo a roles autorizados |
| Verificación administrativa | Solo el administrador puede aprobar o rechazar el comprobante |
| Envío a almacén | Una aprobación pasa a preparación o a pendiente de reabastecimiento y se muestra al jefe de almacén |
| Reserva de stock | Bloqueo de filas y transacción para impedir que dos pedidos reserven la misma unidad |
| Pedido listo | El jefe de almacén descuenta stock reservado, registra movimientos y marca listo para recojo |
| Aviso al cliente | Se envía por SMTP y queda trazado en notificaciones |
| Entrega | Se registra el estado final Entregada |

## Reabastecimiento
| Activador | Implementación |
|---|---|
| Cotización supera stock | Genera una solicitud por el faltante de cada producto |
| Stock debajo del mínimo | Se evalúa al iniciar, mover, editar, auditar, recibir o despachar stock |
| Inicio mensual insuficiente | Se ejecuta una revisión única por producto y mes contra el stock mensual previsto |
| Proveedores del producto | Tabla intermedia proveedor-producto con precio, entrega, pedidos y puntaje |
| Comparación ponderada | Precio 40 %, entrega 20 %, pedidos anteriores 10 % y puntaje 30 % |
| Empates | Todos los candidatos con la puntuación máxima aparecen como mejores |
| Decisión del administrador | Selección explícita y generación de orden de compra |
| Voucher al proveedor | Archivo validado, guardado y enviado por SMTP |
| Espera | Estado EnTransito hasta la recepción |

## Recepción e inventario
| Requisito | Implementación |
|---|---|
| Integridad | Se registran unidades buenas, faltantes y defectuosas |
| Validación de cantidades | La suma debe coincidir exactamente con la cantidad solicitada |
| Actualización de stock | Solo las unidades buenas incrementan existencias |
| Reposición de observaciones | Faltantes y defectuosos generan una nueva solicitud |
| Auditoría cada 15 días | Cada auditoría genera una próxima fecha a 15 días |
| Mermas y ajustes | Diferencias del conteo crean movimientos y actualizan stock |
| Nuevas alertas | Después de cada auditoría se vuelve a evaluar el reabastecimiento |

## Gestión
| Requisito | Implementación |
|---|---|
| Productos | Alta, edición, desactivación, categorías, precios, stocks y detalles |
| Descuentos | Porcentaje de venta aplicado al cliente y porcentaje de compra aplicado al ranking |
| Imágenes | PNG, JPG o WEBP en la base, sin depender de dominios externos |
| Trabajadores | Alta, bloqueo, reactivación y roles |
| Contraseña temporal | Últimos cuatro dígitos del DNI, apellido, número aleatorio y refuerzo de complejidad |
| Verificación de correo | Código de seis dígitos con vencimiento y envío SMTP |
| Cambio de contraseña | Activación con contraseña nueva y cambio posterior desde configuración |
| Proveedores | Razón social, contacto, RUC, teléfono, correo, ubicación y productos vendidos |