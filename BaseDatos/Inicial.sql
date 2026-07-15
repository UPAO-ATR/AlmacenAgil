CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  dni CHAR(8) UNIQUE NOT NULL CHECK (dni ~ '^[0-9]{8}$'),
  correo VARCHAR(160) UNIQUE NOT NULL CHECK (correo = LOWER(correo)),
  clave TEXT NOT NULL,
  rol VARCHAR(30) NOT NULL CHECK (rol IN ('Administrador','AsesorVentas','JefeAlmacen')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  correoverificado BOOLEAN NOT NULL DEFAULT FALSE,
  debecambiarclave BOOLEAN NOT NULL DEFAULT TRUE,
  codigoverificacion TEXT,
  codigovence TIMESTAMPTZ,
  intentosfallidos INTEGER NOT NULL DEFAULT 0 CHECK (intentosfallidos >= 0),
  bloqueadohasta TIMESTAMPTZ,
  versionsesion INTEGER NOT NULL DEFAULT 1 CHECK (versionsesion > 0),
  metodoactivacion VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (metodoactivacion IN ('Pendiente','Codigo','Administrador','Inicial')),
  esrespaldo BOOLEAN NOT NULL DEFAULT FALSE,
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correoverificado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debecambiarclave BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigoverificacion TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigovence TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentosfallidos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueadohasta TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS versionsesion INTEGER NOT NULL DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS metodoactivacion VARCHAR(20) NOT NULL DEFAULT 'Pendiente';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS esrespaldo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE usuarios SET metodoactivacion='Inicial'
WHERE correoverificado=true AND metodoactivacion='Pendiente';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='usuarios_metodoactivacion_check') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_metodoactivacion_check
      CHECK (metodoactivacion IN ('Pendiente','Codigo','Administrador','Inicial'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL CHECK (codigo ~ '^[A-Z0-9]{3,20}$'),
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(500) NOT NULL DEFAULT '',
  categoriaid INTEGER NOT NULL REFERENCES categorias(id),
  tipoproducto VARCHAR(30) NOT NULL DEFAULT 'Otros' CHECK (tipoproducto IN ('Papel','Cartón','Sobres','Otros')),
  material VARCHAR(80) NOT NULL DEFAULT 'No especificado' CHECK (LENGTH(BTRIM(material)) BETWEEN 1 AND 80),
  grosor VARCHAR(40) NOT NULL DEFAULT 'No aplica' CHECK (LENGTH(BTRIM(grosor)) BETWEEN 1 AND 40),
  dimensiones VARCHAR(80) NOT NULL DEFAULT 'No especificada' CHECK (LENGTH(BTRIM(dimensiones)) BETWEEN 1 AND 80),
  maximopedido INTEGER NOT NULL DEFAULT 100 CHECK (maximopedido BETWEEN 1 AND 1000),
  precioventa NUMERIC(12,2) NOT NULL CHECK (precioventa >= 0),
  preciocompra NUMERIC(12,2) NOT NULL CHECK (preciocompra >= 0),
  descuentoventa NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuentoventa BETWEEN 0 AND 100),
  descuentocompra NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuentocompra BETWEEN 0 AND 100),
  stockactual INTEGER NOT NULL CHECK (stockactual BETWEEN 0 AND 1000),
  stockreservado INTEGER NOT NULL DEFAULT 0 CHECK (stockreservado BETWEEN 0 AND 1000 AND stockreservado <= stockactual),
  stockminimo INTEGER NOT NULL CHECK (stockminimo BETWEEN 0 AND 1000),
  stockmensual INTEGER NOT NULL CHECK (stockmensual BETWEEN 0 AND 1000),
  imagen TEXT NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipoproducto VARCHAR(30) NOT NULL DEFAULT 'Otros';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS material VARCHAR(80) NOT NULL DEFAULT 'No especificado';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS grosor VARCHAR(40) NOT NULL DEFAULT 'No aplica';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS dimensiones VARCHAR(80) NOT NULL DEFAULT 'No especificada';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS maximopedido INTEGER NOT NULL DEFAULT 100;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descuentoventa NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descuentocompra NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stockreservado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen TEXT NOT NULL DEFAULT '';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE productos SET
  stockreservado=LEAST(GREATEST(stockreservado,0),1000),
  stockminimo=LEAST(GREATEST(stockminimo,0),1000),
  stockmensual=LEAST(GREATEST(stockmensual,0),1000),
  maximopedido=LEAST(GREATEST(maximopedido,1),1000);
UPDATE productos SET stockactual=LEAST(GREATEST(stockactual,stockreservado),1000);

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockactual_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockreservado_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockminimo_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockmensual_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockactual_limite_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockreservado_limite_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockminimo_limite_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stockmensual_limite_check;
ALTER TABLE productos ADD CONSTRAINT productos_stockactual_limite_check CHECK (stockactual BETWEEN 0 AND 1000);
ALTER TABLE productos ADD CONSTRAINT productos_stockreservado_limite_check CHECK (stockreservado BETWEEN 0 AND 1000 AND stockreservado <= stockactual);
ALTER TABLE productos ADD CONSTRAINT productos_stockminimo_limite_check CHECK (stockminimo BETWEEN 0 AND 1000);
ALTER TABLE productos ADD CONSTRAINT productos_stockmensual_limite_check CHECK (stockmensual BETWEEN 0 AND 1000);
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_maximopedido_check;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_maximopedido_limite_check;
ALTER TABLE productos ADD CONSTRAINT productos_maximopedido_limite_check CHECK (maximopedido BETWEEN 1 AND 1000);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='productos_tipoproducto_check') THEN
    ALTER TABLE productos ADD CONSTRAINT productos_tipoproducto_check CHECK (tipoproducto IN ('Papel','Cartón','Sobres','Otros'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='productos_material_check') THEN
    ALTER TABLE productos ADD CONSTRAINT productos_material_check CHECK (LENGTH(BTRIM(material)) BETWEEN 1 AND 80);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='productos_grosor_check') THEN
    ALTER TABLE productos ADD CONSTRAINT productos_grosor_check CHECK (LENGTH(BTRIM(grosor)) BETWEEN 1 AND 40);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='productos_dimensiones_check') THEN
    ALTER TABLE productos ADD CONSTRAINT productos_dimensiones_check CHECK (LENGTH(BTRIM(dimensiones)) BETWEEN 1 AND 80);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  razonsocial VARCHAR(160) NOT NULL,
  ruc CHAR(11) UNIQUE NOT NULL CHECK (ruc ~ '^[0-9]{11}$'),
  contacto VARCHAR(120) NOT NULL,
  telefono VARCHAR(15) NOT NULL CHECK (telefono ~ '^[+]?[0-9]{7,15}$'),
  correo VARCHAR(160) NOT NULL CHECK (correo = LOWER(correo)),
  ubicacion VARCHAR(220) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proveedores DROP COLUMN IF EXISTS preciohabitual;
ALTER TABLE proveedores DROP COLUMN IF EXISTS diasentrega;
ALTER TABLE proveedores DROP COLUMN IF EXISTS pedidosanteriores;
ALTER TABLE proveedores DROP COLUMN IF EXISTS puntaje;

CREATE TABLE IF NOT EXISTS proveedorproductos (
  id SERIAL PRIMARY KEY,
  proveedorid INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  productoid INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  preciohabitual NUMERIC(12,2) NOT NULL CHECK (preciohabitual >= 0),
  descuentolanzamiento NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuentolanzamiento BETWEEN 0 AND 100),
  diasentrega INTEGER NOT NULL CHECK (diasentrega BETWEEN 1 AND 365),
  pedidosanteriores INTEGER NOT NULL DEFAULT 0 CHECK (pedidosanteriores >= 0),
  puntaje NUMERIC(2,1) NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(proveedorid,productoid)
);

ALTER TABLE proveedorproductos ADD COLUMN IF NOT EXISTS descuentolanzamiento NUMERIC(5,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='proveedorproductos_descuentolanzamiento_check') THEN
    ALTER TABLE proveedorproductos ADD CONSTRAINT proveedorproductos_descuentolanzamiento_check CHECK (descuentolanzamiento BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  cliente VARCHAR(160) NOT NULL,
  dni CHAR(8) CHECK (dni IS NULL OR dni ~ '^[0-9]{8}$'),
  ruc CHAR(11) CHECK (ruc IS NULL OR ruc ~ '^[0-9]{11}$'),
  telefono VARCHAR(15) NOT NULL CHECK (telefono ~ '^[+]?[0-9]{7,15}$'),
  correo VARCHAR(160) NOT NULL CHECK (correo = LOWER(correo)),
  estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente',
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  asesorid INTEGER REFERENCES usuarios(id),
  notacontacto VARCHAR(500),
  contactadoen TIMESTAMPTZ,
  comprobante BYTEA,
  comprobantemime VARCHAR(80),
  comprobantenombre VARCHAR(180),
  comprobanteen TIMESTAMPTZ,
  verificadorid INTEGER REFERENCES usuarios(id),
  verificadoen TIMESTAMPTZ,
  observacionpago VARCHAR(500),
  notificacionlistaen TIMESTAMPTZ,
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (dni IS NOT NULL OR ruc IS NOT NULL)
);

ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS asesorid INTEGER REFERENCES usuarios(id);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS notacontacto VARCHAR(500);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS contactadoen TIMESTAMPTZ;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS comprobante BYTEA;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS comprobantemime VARCHAR(80);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS comprobantenombre VARCHAR(180);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS comprobanteen TIMESTAMPTZ;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS verificadorid INTEGER REFERENCES usuarios(id);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS verificadoen TIMESTAMPTZ;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS observacionpago VARCHAR(500);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS notificacionlistaen TIMESTAMPTZ;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_estado_check;
UPDATE cotizaciones SET estado='Contactada' WHERE estado='Aprobada';
UPDATE cotizaciones SET estado='PagoVerificado' WHERE estado='Pagada';
UPDATE cotizaciones SET estado='EnPreparacion' WHERE estado='Preparacion';
UPDATE cotizaciones SET estado='ListaRecojo' WHERE estado='Lista';
ALTER TABLE cotizaciones ADD CONSTRAINT cotizaciones_estado_check CHECK (estado IN ('Pendiente','Contactada','ComprobanteAdjunto','PagoVerificado','PagoRechazado','PendienteReabastecimiento','EnPreparacion','ListaRecojo','Entregada','Rechazada'));

CREATE TABLE IF NOT EXISTS detallecotizacion (
  id SERIAL PRIMARY KEY,
  cotizacionid INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  productoid INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad BETWEEN 1 AND 1000),
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  descuentofijo NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuentofijo BETWEEN 0 AND 100),
  descuentovolumen NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuentovolumen BETWEEN 0 AND 100),
  descuento NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuento BETWEEN 0 AND 100),
  cantidadreservada INTEGER NOT NULL DEFAULT 0 CHECK (cantidadreservada >= 0 AND cantidadreservada <= cantidad),
  UNIQUE(cotizacionid,productoid)
);

ALTER TABLE detallecotizacion ADD COLUMN IF NOT EXISTS descuentofijo NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE detallecotizacion ADD COLUMN IF NOT EXISTS descuentovolumen NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE detallecotizacion ADD COLUMN IF NOT EXISTS descuento NUMERIC(5,2) NOT NULL DEFAULT 0;
UPDATE detallecotizacion SET descuentofijo=descuento WHERE descuentofijo=0 AND descuentovolumen=0 AND descuento>0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='detallecotizacion_descuentofijo_check') THEN
    ALTER TABLE detallecotizacion ADD CONSTRAINT detallecotizacion_descuentofijo_check CHECK (descuentofijo BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='detallecotizacion_descuentovolumen_check') THEN
    ALTER TABLE detallecotizacion ADD CONSTRAINT detallecotizacion_descuentovolumen_check CHECK (descuentovolumen BETWEEN 0 AND 100);
  END IF;
END $$;

ALTER TABLE detallecotizacion ADD COLUMN IF NOT EXISTS cantidadreservada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE detallecotizacion DROP CONSTRAINT IF EXISTS detallecotizacion_cantidad_limite_check;
ALTER TABLE detallecotizacion ADD CONSTRAINT detallecotizacion_cantidad_limite_check CHECK (cantidad BETWEEN 1 AND 1000) NOT VALID;

CREATE TABLE IF NOT EXISTS historialcotizaciones (
  id BIGSERIAL PRIMARY KEY,
  cotizacionid INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  estadoanterior VARCHAR(40),
  estadonuevo VARCHAR(40) NOT NULL,
  observacion VARCHAR(500) NOT NULL DEFAULT '',
  usuarioid INTEGER REFERENCES usuarios(id),
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos (
  id BIGSERIAL PRIMARY KEY,
  productoid INTEGER NOT NULL REFERENCES productos(id),
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('Entrada','Salida','Merma','Ajuste','Reserva','Liberacion')),
  cantidad INTEGER NOT NULL CHECK (cantidad BETWEEN 1 AND 1000),
  motivo VARCHAR(250) NOT NULL,
  usuarioid INTEGER REFERENCES usuarios(id),
  cotizacionid INTEGER REFERENCES cotizaciones(id),
  reabastecimientoid INTEGER,
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_tipo_check CHECK (tipo IN ('Entrada','Salida','Merma','Ajuste','Reserva','Liberacion'));
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cotizacionid INTEGER REFERENCES cotizaciones(id);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS reabastecimientoid INTEGER;
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_cantidad_limite_check;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_cantidad_limite_check CHECK (cantidad BETWEEN 1 AND 1000) NOT VALID;

CREATE TABLE IF NOT EXISTS reabastecimientos (
  id SERIAL PRIMARY KEY,
  productoid INTEGER NOT NULL REFERENCES productos(id),
  cotizacionid INTEGER REFERENCES cotizaciones(id),
  motivo VARCHAR(30) NOT NULL CHECK (motivo IN ('Cotizacion','StockMinimo','StockMensual','Auditoria','Manual')),
  cantidadrequerida INTEGER NOT NULL CHECK (cantidadrequerida BETWEEN 1 AND 1000),
  estado VARCHAR(35) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','ProveedorSeleccionado','PagoRegistrado','EnTransito','Recibido','RecibidoObservado','Cancelado')),
  proveedorid INTEGER REFERENCES proveedores(id),
  ordencompra VARCHAR(40) UNIQUE,
  comprobante BYTEA,
  comprobantemime VARCHAR(80),
  comprobantenombre VARCHAR(180),
  pagoen TIMESTAMPTZ,
  observacion VARCHAR(500) NOT NULL DEFAULT '',
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reabastecimientos DROP CONSTRAINT IF EXISTS reabastecimientos_cantidad_limite_check;
ALTER TABLE reabastecimientos ADD CONSTRAINT reabastecimientos_cantidad_limite_check CHECK (cantidadrequerida BETWEEN 1 AND 1000) NOT VALID;

ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_reabastecimientoid_fkey;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_reabastecimientoid_fkey FOREIGN KEY (reabastecimientoid) REFERENCES reabastecimientos(id);

CREATE TABLE IF NOT EXISTS historialreabastecimientos (
  id BIGSERIAL PRIMARY KEY,
  reabastecimientoid INTEGER NOT NULL REFERENCES reabastecimientos(id) ON DELETE CASCADE,
  estadoanterior VARCHAR(35),
  estadonuevo VARCHAR(35) NOT NULL,
  observacion VARCHAR(500) NOT NULL DEFAULT '',
  usuarioid INTEGER REFERENCES usuarios(id),
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recepciones (
  id SERIAL PRIMARY KEY,
  reabastecimientoid INTEGER UNIQUE REFERENCES reabastecimientos(id),
  proveedorid INTEGER NOT NULL REFERENCES proveedores(id),
  solicitada INTEGER NOT NULL DEFAULT 0 CHECK (solicitada BETWEEN 0 AND 1000),
  recibida INTEGER NOT NULL DEFAULT 0 CHECK (recibida BETWEEN 0 AND 1000),
  faltantes INTEGER NOT NULL DEFAULT 0 CHECK (faltantes BETWEEN 0 AND 1000),
  defectuosos INTEGER NOT NULL DEFAULT 0 CHECK (defectuosos BETWEEN 0 AND 1000),
  observacion VARCHAR(500) NOT NULL,
  usuarioid INTEGER REFERENCES usuarios(id),
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (recibida + faltantes + defectuosos = solicitada)
);

ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS reabastecimientoid INTEGER UNIQUE REFERENCES reabastecimientos(id);
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS solicitada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS recibida INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS usuarioid INTEGER REFERENCES usuarios(id);
ALTER TABLE recepciones DROP CONSTRAINT IF EXISTS recepciones_cantidades_limite_check;
ALTER TABLE recepciones ADD CONSTRAINT recepciones_cantidades_limite_check CHECK (
  solicitada BETWEEN 0 AND 1000 AND recibida BETWEEN 0 AND 1000 AND
  faltantes BETWEEN 0 AND 1000 AND defectuosos BETWEEN 0 AND 1000
) NOT VALID;

CREATE TABLE IF NOT EXISTS auditoriasinventario (
  id SERIAL PRIMARY KEY,
  usuarioid INTEGER NOT NULL REFERENCES usuarios(id),
  observacion VARCHAR(500) NOT NULL,
  realizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proximafecha TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 days')
);

CREATE TABLE IF NOT EXISTS detalleauditoria (
  id BIGSERIAL PRIMARY KEY,
  auditoriaid INTEGER NOT NULL REFERENCES auditoriasinventario(id) ON DELETE CASCADE,
  productoid INTEGER NOT NULL REFERENCES productos(id),
  stocksistema INTEGER NOT NULL CHECK (stocksistema BETWEEN 0 AND 1000),
  stockcontado INTEGER NOT NULL CHECK (stockcontado BETWEEN 0 AND 1000),
  diferencia INTEGER NOT NULL,
  UNIQUE(auditoriaid,productoid)
);

CREATE TABLE IF NOT EXISTS revisionesmensuales (
  id BIGSERIAL PRIMARY KEY,
  productoid INTEGER NOT NULL REFERENCES productos(id),
  periodo CHAR(7) NOT NULL CHECK (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  stockrevisado INTEGER NOT NULL CHECK (stockrevisado BETWEEN 0 AND 1000),
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(productoid,periodo)
);

ALTER TABLE detalleauditoria DROP CONSTRAINT IF EXISTS detalleauditoria_stock_limite_check;
ALTER TABLE detalleauditoria ADD CONSTRAINT detalleauditoria_stock_limite_check CHECK (
  stocksistema BETWEEN 0 AND 1000 AND stockcontado BETWEEN 0 AND 1000
) NOT VALID;
ALTER TABLE revisionesmensuales DROP CONSTRAINT IF EXISTS revisionesmensuales_stock_limite_check;
ALTER TABLE revisionesmensuales ADD CONSTRAINT revisionesmensuales_stock_limite_check CHECK (stockrevisado BETWEEN 0 AND 1000) NOT VALID;

CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Cliente','Proveedor','Trabajador')),
  destinatario VARCHAR(160) NOT NULL,
  asunto VARCHAR(180) NOT NULL,
  cuerpo TEXT NOT NULL,
  estado VARCHAR(25) NOT NULL CHECK (estado IN ('Enviado','Pendiente','Error')),
  error VARCHAR(500),
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviadoen TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auditoriaacciones (
  id BIGSERIAL PRIMARY KEY,
  usuarioid INTEGER REFERENCES usuarios(id),
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(80) NOT NULL,
  entidadid VARCHAR(40),
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  direccionip VARCHAR(80),
  creadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracionempresa (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
  nombrecomercial VARCHAR(120) NOT NULL,
  razonsocial VARCHAR(160) NOT NULL,
  ruc CHAR(11) NOT NULL CHECK (ruc ~ '^[0-9]{11}$'),
  direccion VARCHAR(220) NOT NULL,
  telefono VARCHAR(15) NOT NULL CHECK (telefono ~ '^[+]?[0-9]{7,15}$'),
  correo VARCHAR(160) NOT NULL CHECK (correo=LOWER(correo)),
  serie CHAR(4) NOT NULL CHECK (serie ~ '^[A-Z0-9]{4}$'),
  actualizadoen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracionempresa(id,nombrecomercial,razonsocial,ruc,direccion,telefono,correo,serie)
VALUES(1,'ELIM-A','ELIM-A','20123456789','Dirección pendiente de configurar','000000000','ventas@almacenagil.pe','FI01')
ON CONFLICT (id) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS secuenciafacturas START 1;

CREATE TABLE IF NOT EXISTS facturas (
  id BIGSERIAL PRIMARY KEY,
  cotizacionid INTEGER UNIQUE NOT NULL REFERENCES cotizaciones(id),
  serie CHAR(4) NOT NULL CHECK (serie ~ '^[A-Z0-9]{4}$'),
  numero BIGINT UNIQUE NOT NULL DEFAULT nextval('secuenciafacturas'),
  codigo VARCHAR(40) UNIQUE NOT NULL CHECK (codigo ~ '^[A-Z0-9]{20,40}$'),
  contenido JSONB NOT NULL,
  huella CHAR(64) NOT NULL CHECK (huella ~ '^[a-f0-9]{64}$'),
  usuarioid INTEGER REFERENCES usuarios(id),
  emitidaen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS indicefacturascodigo ON facturas(codigo);
CREATE INDEX IF NOT EXISTS indicefacturasfecha ON facturas(emitidaen DESC);

CREATE INDEX IF NOT EXISTS indiceproductosactivo ON productos(activo);
CREATE INDEX IF NOT EXISTS indiceproductosfiltros ON productos(tipoproducto,material,grosor,dimensiones);
CREATE INDEX IF NOT EXISTS indiceproductosstock ON productos(stockactual,stockminimo);
CREATE INDEX IF NOT EXISTS indicecotizacionesestado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS indicecotizacionesfecha ON cotizaciones(creadoen DESC);
CREATE INDEX IF NOT EXISTS indicemovimientosfecha ON movimientos(creadoen DESC);
CREATE INDEX IF NOT EXISTS indicereabastecimientosestado ON reabastecimientos(estado);
CREATE INDEX IF NOT EXISTS indiceauditoriaaccionesfecha ON auditoriaacciones(creadoen DESC);
CREATE INDEX IF NOT EXISTS indicenotificacionesfecha ON notificaciones(creadoen DESC);

INSERT INTO categorias(nombre) VALUES
('Papelería'),
('Escritura'),
('Archivo'),
('Oficina')
ON CONFLICT DO NOTHING;

INSERT INTO productos(codigo,nombre,descripcion,categoriaid,tipoproducto,material,grosor,dimensiones,maximopedido,precioventa,preciocompra,descuentoventa,descuentocompra,stockactual,stockminimo,stockmensual) VALUES
('PAP001','Papel Bond A4','Resma de 500 hojas',1,'Papel','Bond','75 g','A4',100,24.90,18.50,0,0,48,20,80),
('ESC001','Lapicero Azul','Caja por 50 unidades',2,'Otros','Plástico','No aplica','Estándar',100,31.50,22.00,5,0,16,15,40),
('ARC001','Archivador A4','Lomo ancho reforzado',3,'Otros','Cartón prensado','No aplica','A4',100,9.90,6.20,0,3,7,10,30),
('OFI001','Grapadora Mediana','Capacidad de 25 hojas',4,'Otros','Metal','No aplica','Mediana',50,18.90,12.50,0,0,0,5,12),
('PAP002','Papel Avena 90 g','Paquete de papel avena',1,'Papel','Avena','90 g','40 cm x 60 cm',120,32.90,24.50,0,0,35,12,50),
('PAP003','Papel Dúplex C10','Lámina de papel dúplex',1,'Papel','Dúplex','C10','A4',150,1.80,1.10,0,0,180,50,250),
('CAR001','Cartón Corrugado 3 mm','Plancha de cartón corrugado',1,'Cartón','Corrugado','3 mm','50 cm x 70 cm',80,8.50,5.60,0,0,42,15,70),
('SOB001','Sobre Manila Oficio','Paquete de sobres manila',1,'Sobres','Manila','No aplica','Oficio',100,18.00,12.20,10,0,60,20,90)
ON CONFLICT DO NOTHING;

UPDATE productos SET tipoproducto='Papel',material='Bond',grosor='75 g',dimensiones='A4',maximopedido=100 WHERE codigo='PAP001';
UPDATE productos SET tipoproducto='Otros',material='Plástico',grosor='No aplica',dimensiones='Estándar',maximopedido=100 WHERE codigo='ESC001';
UPDATE productos SET tipoproducto='Otros',material='Cartón prensado',grosor='No aplica',dimensiones='A4',maximopedido=100 WHERE codigo='ARC001';
UPDATE productos SET tipoproducto='Otros',material='Metal',grosor='No aplica',dimensiones='Mediana',maximopedido=50 WHERE codigo='OFI001';

INSERT INTO proveedores(razonsocial,ruc,contacto,telefono,correo,ubicacion) VALUES
('Distribuciones Norte SAC','20601234567','María Torres','987654321','ventas@norte.pe','Trujillo'),
('Comercial Papelera SAC','20509876543','Luis Rojas','976543210','pedidos@papelera.pe','Lima'),
('Suministros Perú EIRL','20401122334','Ana Ruiz','965432109','contacto@suministros.pe','Chiclayo')
ON CONFLICT DO NOTHING;

INSERT INTO proveedorproductos(proveedorid,productoid,preciohabitual,descuentolanzamiento,diasentrega,pedidosanteriores,puntaje)
SELECT proveedor.id,producto.id,datos.precio,datos.descuento,datos.dias,datos.pedidos,datos.puntaje
FROM (VALUES
  ('20601234567','PAP001',17.80,5,3,24,4.7),
  ('20601234567','ESC001',21.50,0,3,19,4.6),
  ('20601234567','ARC001',6.10,0,4,11,4.5),
  ('20509876543','PAP001',16.90,10,5,41,4.4),
  ('20509876543','ESC001',20.90,0,5,35,4.3),
  ('20509876543','OFI001',12.20,8,6,28,4.4),
  ('20401122334','PAP001',18.20,0,2,13,4.9),
  ('20401122334','ARC001',5.95,12,2,12,4.8),
  ('20401122334','OFI001',12.60,0,2,9,4.9)
) AS datos(ruc,codigo,precio,descuento,dias,pedidos,puntaje)
JOIN proveedores proveedor ON proveedor.ruc=datos.ruc
JOIN productos producto ON producto.codigo=datos.codigo
ON CONFLICT (proveedorid,productoid) DO NOTHING;