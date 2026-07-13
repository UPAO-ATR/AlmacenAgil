import { z } from 'zod'

const Texto = (minimo,maximo) => z.string().trim().min(minimo).max(maximo)
const Correo = z.string().trim().email().max(160).transform(valor=>valor.toLowerCase())
const Dni = z.string().regex(/^\d{8}$/)
const Ruc = z.string().regex(/^\d{11}$/)
const Telefono = z.string().regex(/^\+?\d{7,15}$/)
const Entero = z.coerce.number().finite().int().min(0).max(1000000)
const Positivo = z.coerce.number().finite().int().min(1).max(1000000)
const Dinero = z.coerce.number().finite().min(0).max(100000000)
const Porcentaje = z.coerce.number().finite().min(0).max(100)
const DocumentoOpcional = esquema => z.union([esquema,z.literal('')]).optional().transform(valor=>valor||undefined)
const Clave = z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[^A-Za-z0-9]/)
const Archivo = z.object({
  nombre: Texto(1,180),
  tipo: z.enum(['application/pdf','image/png','image/jpeg','image/webp']),
  datos: z.string().min(8).max(1800000).regex(/^[A-Za-z0-9+/=]+$/)
}).strict()

export const EsquemaAcceso = z.object({correo:Correo,clave:z.string().min(8).max(128)}).strict()

export const EsquemaActivacion = z.object({
  correo:Correo,
  codigo:z.string().regex(/^\d{6}$/),
  clavetemporal:z.string().min(12).max(128),
  clavenueva:Clave
}).strict()

export const EsquemaCambioClave = z.object({
  claveactual:z.string().min(8).max(128),
  clavenueva:Clave
}).strict().refine(valor=>valor.claveactual!==valor.clavenueva,{message:'La nueva clave debe ser distinta',path:['clavenueva']})

export const EsquemaProducto = z.object({
  codigo:Texto(3,20).transform(valor=>valor.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]+$/)),
  nombre:Texto(3,120),
  descripcion:Texto(0,500),
  categoriaid:z.coerce.number().int().positive().max(1000000),
  precioventa:Dinero,
  preciocompra:Dinero,
  descuentoventa:Porcentaje,
  descuentocompra:Porcentaje,
  stockactual:Entero,
  stockminimo:Entero,
  stockmensual:Entero,
  imagen:z.string().max(700000).refine(valor=>valor===''||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(valor),'Imagen inválida')
}).strict().refine(valor=>valor.stockactual>=0,{message:'Stock inválido'})

export const EsquemaProveedor = z.object({
  razonsocial:Texto(3,160),
  ruc:Ruc,
  contacto:Texto(3,120),
  telefono:Telefono,
  correo:Correo,
  ubicacion:Texto(3,220)
}).strict()

export const EsquemaProveedorProducto = z.object({
  productoid:z.coerce.number().int().positive().max(1000000),
  preciohabitual:Dinero,
  diasentrega:z.coerce.number().finite().int().min(1).max(365),
  pedidosanteriores:Entero,
  puntaje:z.coerce.number().finite().min(1).max(5)
}).strict()

export const EsquemaUsuario = z.object({
  nombres:Texto(2,80),
  apellidos:Texto(2,80),
  dni:Dni,
  correo:Correo,
  rol:z.enum(['Administrador','AsesorVentas','JefeAlmacen'])
}).strict()

export const EsquemaCotizacion = z.object({
  cliente:Texto(3,160),
  dni:DocumentoOpcional(Dni),
  ruc:DocumentoOpcional(Ruc),
  telefono:Telefono,
  correo:Correo,
  productos:z.array(z.object({
    productoid:z.coerce.number().int().positive().max(1000000),
    cantidad:z.coerce.number().int().min(1).max(10000)
  }).strict()).min(1).max(100)
}).strict()
  .refine(valor=>Boolean(valor.dni||valor.ruc),{message:'Ingrese DNI o RUC'})
  .refine(valor=>new Set(valor.productos.map(item=>item.productoid)).size===valor.productos.length,{message:'No repita productos'})

export const EsquemaContactoCotizacion = z.object({nota:Texto(3,500)}).strict()
export const EsquemaComprobanteCotizacion = z.object({archivo:Archivo}).strict()
export const EsquemaVerificacionPago = z.object({aprobado:z.boolean(),observacion:Texto(3,500)}).strict()
export const EsquemaObservacion = z.object({observacion:Texto(0,500)}).strict()

export const EsquemaMovimiento = z.object({
  productoid:z.coerce.number().int().positive().max(1000000),
  tipo:z.enum(['Entrada','Salida','Merma','Ajuste']),
  cantidad:Positivo,
  motivo:Texto(3,250)
}).strict()

export const EsquemaReabastecimientoManual = z.object({
  productoid:z.coerce.number().int().positive().max(1000000),
  cantidadrequerida:Positivo,
  observacion:Texto(3,500)
}).strict()

export const EsquemaSeleccionProveedor = z.object({
  proveedorid:z.coerce.number().int().positive().max(1000000),
  observacion:Texto(0,500)
}).strict()

export const EsquemaPagoProveedor = z.object({archivo:Archivo,observacion:Texto(0,500)}).strict()

export const EsquemaRecepcion = z.object({
  reabastecimientoid:z.coerce.number().int().positive().max(1000000),
  recibida:Entero,
  faltantes:Entero,
  defectuosos:Entero,
  observacion:Texto(3,500)
}).strict()

export const EsquemaAuditoria = z.object({
  observacion:Texto(3,500),
  productos:z.array(z.object({
    productoid:z.coerce.number().int().positive().max(1000000),
    stockcontado:Entero
  }).strict()).min(1).max(500)
}).strict().refine(valor=>new Set(valor.productos.map(item=>item.productoid)).size===valor.productos.length,{message:'No repita productos'})