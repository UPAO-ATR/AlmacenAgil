Límite de inventario

Todo valor relacionado con existencias queda limitado a 1000 unidades:

- Stock actual.
- Stock mínimo.
- Stock mensual.
- Stock reservado.
- Máximo por pedido.
- Movimientos de inventario.
- Cantidades de cotización.
- Reabastecimientos.
- Recepciones.
- Conteos de auditoría.

La validación se aplica en el navegador, en el servidor y mediante restricciones PostgreSQL. Los valores históricos de productos que superen 1000 se normalizan durante la siguiente inicialización.

Factura interna verificable

La factura se genera cuando una cotización llega al estado “Entregada”.

Incluye:

- Serie y correlativo.
- Datos configurables de la empresa.
- Datos del cliente.
- Productos, cantidades, precios y descuentos.
- Total de la venta.
- Fechas y responsables del pago, entrega y emisión.
- Código de verificación.
- Huella SHA-256.
- Código QR.

La factura puede descargarse desde “Cotizaciones” y comprobarse desde su código o QR.

Configuración

Antes de emitir, el administrador debe abrir:

“Configuración → Datos de la factura interna”

Allí registra nombre comercial, razón social, RUC, dirección, teléfono, correo y serie interna.

Alcance

La factura es una constancia interna verificable. No es un comprobante electrónico SUNAT y no reemplaza una factura o boleta tributaria.
