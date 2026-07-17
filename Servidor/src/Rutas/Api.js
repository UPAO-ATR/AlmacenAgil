import crypto from 'crypto'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { BaseDatos } from '../BaseDatos.js'
import {
  Autenticar,
  Autorizar,
  ExigirClaveActualizada,
  ExigirProteccion,
  LimiteAcceso,
  LimiteActivacion,
  LimiteConsultaDni,
  LimiteConsultaRuc,
  LimiteCotizacion,
  Validar,
  ValidarIdentificador
} from '../Intermediarios/Seguridad.js'
import {
  EsquemaAcceso,
  EsquemaActivacion,
  EsquemaAuditoria,
  EsquemaCambioClave,
  EsquemaConfirmacion,
  EsquemaEmpresa,
  EsquemaComprobanteCotizacion,
  EsquemaContactoCotizacion,
  EsquemaCotizacion,
  EsquemaMovimiento,
  EsquemaObservacion,
  EsquemaPagoProveedor,
  EsquemaProducto,
  EsquemaProveedor,
  EsquemaProveedorProducto,
  EsquemaReabastecimientoManual,
  EsquemaRecepcion,
  EsquemaSeleccionProveedor,
  EsquemaUsuario,
  EsquemaVerificacionPago
} from '../Validaciones/Esquemas.js'
import { PrepararArchivo,EnviarArchivo } from '../Servicios/Archivos.js'
import { RegistrarAuditoria } from '../Servicios/Auditoria.js'
import { CalcularDescuentoTotal,CalcularSubtotal } from '../Servicios/Descuentos.js'
import { EnviarCorreo } from '../Servicios/Correo.js'
import { FacturaPublica,CrearFactura,GenerarPdfFactura,ObtenerFactura } from '../Servicios/Facturas.js'
import { ConsultarRuc,RucEsValido } from '../Servicios/Sunat.js'
import { ConsultarDni,EsMayorDeEdad,CapitalizarTexto,PrefijoCorreo } from '../Servicios/Reniec.js'
import {
  CompletarReservasPendientes,
  CrearReabastecimiento,
  DespacharCotizacion,
  EvaluarInicioMensual,
  EvaluarProducto,
  LiberarReservasCotizacion,
  RegistrarHistorialCotizacion,
  RegistrarHistorialReabastecimiento,
  ReservarCotizacion
} from '../Servicios/Flujos.js'

export const Api=Router()

const Administrador=Autorizar('Administrador')
const Ventas=Autorizar('Administrador','AsesorVentas')
const Almacen=Autorizar('Administrador','JefeAlmacen')
const Operacion=Autorizar('Administrador','AsesorVentas','JefeAlmacen')

function OpcionesCookie() {
  return {
    httpOnly:true,
    sameSite:'strict',
    secure:process.env.ENTORNO==='produccion',
    maxAge:7_200_000,
    path:'/'
  }
}

function FirmarSesion(usuario) {
  const proteccion=crypto.randomBytes(32).toString('hex')
  const token=jwt.sign({
    id:usuario.id,
    version:usuario.versionsesion,
    proteccion
  },process.env.SECRETOACCESO,{
    algorithm:'HS256',
    expiresIn:'2h',
    issuer:'AlmacenAgil',
    audience:'AplicacionAlmacen'
  })
  return {token,proteccion}
}

function UsuarioPublico(usuario,proteccion) {
  return {
    id:usuario.id,
    nombre:`${usuario.nombres} ${usuario.apellidos}`,
    rol:usuario.rol,
    correo:usuario.correo,
    debecambiarclave:usuario.debecambiarclave,
    proteccion
  }
}

function NoEncontrado(res,registro) {
  if (!registro) {
    res.status(404).json({mensaje:'Registro no encontrado'})
    return true
  }
  return false
}

function NormalizarApellido(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z]/g,'').slice(0,18)||'Usuario'
}

function CrearCredenciales(dni,apellidos) {
  const aleatorio=crypto.randomInt(1000,10000)
  const codigo=String(crypto.randomInt(0,1000000)).padStart(6,'0')
  const temporal=`${dni.slice(-4)}${NormalizarApellido(apellidos)}${aleatorio}!Aa`
  const venceen=new Date(Date.now()+30*60*1000).toISOString()
  return {temporal,codigo,venceen}
}

function CredencialesEntregables(correo,credenciales,estadoCorreo) {
  if (estadoCorreo==='Enviado'&&process.env.ENTORNO==='produccion') return undefined
  return {
    correo,
    codigo:credenciales.codigo,
    clavetemporal:credenciales.temporal,
    venceen:credenciales.venceen
  }
}

function CredencialTemporal(correo,credenciales) {
  return {
    correo,
    clavetemporal:credenciales.temporal,
    venceen:credenciales.venceen,
    ingresotemporal:true
  }
}

async function CotizacionCompleta(id,cliente=BaseDatos) {
  return (await cliente.query(
    `SELECT c.*,
      (SELECT b.codigo FROM facturas b WHERE b.cotizacionid=c.id) facturacodigo,
      (SELECT b.serie||'-'||LPAD(b.numero::text,8,'0') FROM facturas b WHERE b.cotizacionid=c.id) facturanumero,
      COALESCE(json_agg(json_build_object(
        'id',d.id,'productoid',d.productoid,'producto',p.nombre,'codigo',p.codigo,
        'cantidad',d.cantidad,'cantidadreservada',d.cantidadreservada,
        'precio',d.precio,'descuentofijo',d.descuentofijo,
        'descuentovolumen',d.descuentovolumen,'descuento',d.descuento,
        'subtotalbase',ROUND(d.cantidad*d.precio,2),
        'subtotal',ROUND(d.cantidad*d.precio*(1-d.descuento/100),2)
      ) ORDER BY d.id) FILTER (WHERE d.id IS NOT NULL),'[]') detalles
     FROM cotizaciones c
     LEFT JOIN detallecotizacion d ON d.cotizacionid=c.id
     LEFT JOIN productos p ON p.id=d.productoid
     WHERE c.id=$1 GROUP BY c.id`,
    [id]
  )).rows[0]
}

Api.get('/salud',(_,res)=>res.json({estado:'operativo'}))

Api.get('/catalogo',async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT p.id,p.codigo,p.nombre,p.descripcion,p.imagen,p.stockactual,p.stockreservado,
      p.tipoproducto,p.material,p.grosor,p.dimensiones,p.maximopedido,
      p.precioventa,p.descuentoventa,
      ROUND(p.precioventa*(1-p.descuentoventa/100),2) preciofinal,
      GREATEST(p.stockactual-p.stockreservado,0) stockdisponible,c.nombre categoria
    FROM productos p
    JOIN categorias c ON c.id=p.categoriaid
    WHERE p.activo=true ORDER BY p.nombre
  `)
  res.json(datos.rows)
})

Api.get('/categorias',async (_,res)=>{
  const datos=await BaseDatos.query('SELECT * FROM categorias ORDER BY nombre')
  res.json(datos.rows)
})

Api.get('/ruc/:ruc',LimiteConsultaRuc,async (req,res)=>{
  const ruc=String(req.params.ruc||'')
  if (!/^\d{11}$/.test(ruc)) return res.status(400).json({mensaje:'RUC inválido'})
  try {
    const resultado=await ConsultarRuc(ruc)
    if (!resultado) return res.status(404).json({mensaje:'RUC no encontrado en SUNAT'})
    if (!RucEsValido(resultado)) return res.status(409).json({mensaje:'El RUC no está activo y habido en SUNAT'})
    res.json({ruc:resultado.numero_documento,razonsocial:resultado.razon_social,estado:resultado.estado,condicion:resultado.condicion})
  } catch {
    res.status(502).json({mensaje:'No se pudo validar el RUC, intente nuevamente'})
  }
})

Api.post('/cotizaciones',LimiteCotizacion,Validar(EsquemaCotizacion),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const ids=req.body.productos.map(item=>item.productoid)
    const productos=(await cliente.query(
      `SELECT id,nombre,precioventa,descuentoventa,maximopedido
       FROM productos WHERE id=ANY($1::int[]) AND activo=true`,
      [ids]
    )).rows
    if (productos.length!==ids.length) throw new Error('Producto inválido')
    const mapa=new Map(productos.map(item=>[item.id,item]))
    const calculos=req.body.productos.map(item=>{
      const producto=mapa.get(item.productoid)
      if (item.cantidad>Number(producto.maximopedido)) {
        throw new Error(`Máximo permitido para ${producto.nombre}: ${producto.maximopedido}`)
      }
      const descuentos=CalcularDescuentoTotal(producto.descuentoventa,item.cantidad)
      return {
        ...item,
        producto,
        ...descuentos,
        subtotal:CalcularSubtotal(producto.precioventa,item.cantidad,descuentos.total)
      }
    })
    const total=calculos.reduce((suma,item)=>suma+item.subtotal,0)
    const nueva=(await cliente.query(
      `INSERT INTO cotizaciones(cliente,dni,ruc,telefono,correo,total)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.body.cliente,null,req.body.ruc,req.body.telefono,req.body.correo,total.toFixed(2)]
    )).rows[0]
    for (const item of calculos) {
      await cliente.query(
        `INSERT INTO detallecotizacion(cotizacionid,productoid,cantidad,precio,descuentofijo,descuentovolumen,descuento)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [nueva.id,item.productoid,item.cantidad,item.producto.precioventa,item.fijo,item.volumen,item.total]
      )
    }
    await RegistrarHistorialCotizacion(cliente,nueva.id,null,'Pendiente','Solicitud creada',null)
    await RegistrarAuditoria(null,'CrearCotizacion','Cotizacion',nueva.id,{cliente:req.body.cliente},req.ip,cliente)
    await cliente.query('COMMIT')
    res.status(201).json(nueva)
  } catch (error) {
    await cliente.query('ROLLBACK')
    const controlado=error.message==='Producto inválido'||error.message.startsWith('Máximo permitido para ')
    res.status(400).json({mensaje:controlado?error.message:'No se pudo registrar la cotización'})
  } finally {
    cliente.release()
  }
})

Api.get('/facturas/verificar/:codigo',async (req,res)=>{
  const codigo=String(req.params.codigo||'').toUpperCase()
  if (!/^[A-Z0-9]{20,40}$/.test(codigo)) return res.status(400).json({mensaje:'Código de factura inválido'})
  const factura=await ObtenerFactura(codigo)
  if (!factura) return res.status(404).json({mensaje:'Factura no encontrada'})
  res.json(FacturaPublica(factura))
})

Api.get('/facturas/:codigo/pdf',async (req,res)=>{
  const codigo=String(req.params.codigo||'').toUpperCase()
  if (!/^[A-Z0-9]{20,40}$/.test(codigo)) return res.status(400).json({mensaje:'Código de factura inválido'})
  const factura=await ObtenerFactura(codigo)
  if (!factura) return res.status(404).json({mensaje:'Factura no encontrada'})
  const url=`${req.protocol}://${req.get('host')}/?verificarfactura=${encodeURIComponent(codigo)}`
  const pdf=await GenerarPdfFactura(factura,url)
  const nombre=`factura-${factura.serie}-${String(factura.numero).padStart(8,'0')}.pdf`
  res.set('Content-Type','application/pdf')
  res.set('Content-Disposition',`attachment; filename="${nombre}"`)
  res.set('X-Content-Type-Options','nosniff')
  res.set('Cache-Control','no-store')
  res.send(pdf)
})

Api.post('/activarcuenta',LimiteActivacion,Validar(EsquemaActivacion),async (req,res)=>{
  const usuario=(await BaseDatos.query('SELECT * FROM usuarios WHERE correo=$1 AND activo=true LIMIT 1',[req.body.correo])).rows[0]
  const codigoValido=usuario?.codigoverificacion&&await bcrypt.compare(req.body.codigo,usuario.codigoverificacion)
  const temporalValida=usuario&&await bcrypt.compare(req.body.clavetemporal,usuario.clave)
  if (!usuario||usuario.correoverificado||!codigoValido||!temporalValida||!usuario.codigovence||new Date(usuario.codigovence)<new Date()) {
    return res.status(400).json({mensaje:'Datos de activación inválidos o vencidos'})
  }
  const nueva=await bcrypt.hash(req.body.clavenueva,12)
  await BaseDatos.query(
    `UPDATE usuarios SET clave=$1,correoverificado=true,debecambiarclave=false,codigoverificacion=NULL,
     codigovence=NULL,metodoactivacion='Codigo',versionsesion=versionsesion+1,actualizadoen=NOW() WHERE id=$2`,
    [nueva,usuario.id]
  )
  await RegistrarAuditoria(usuario.id,'ActivarCuenta','Usuario',usuario.id,{},req.ip)
  res.json({mensaje:'Cuenta activada correctamente'})
})

Api.post('/acceso',LimiteAcceso,Validar(EsquemaAcceso),async (req,res)=>{
  const usuario=(await BaseDatos.query('SELECT * FROM usuarios WHERE correo=$1 LIMIT 1',[req.body.correo])).rows[0]
  const bloqueado=usuario?.bloqueadohasta&&new Date(usuario.bloqueadohasta)>new Date()
  const temporalVencida=usuario?.debecambiarclave&&usuario?.codigovence&&new Date(usuario.codigovence)<new Date()
  const claveCorrecta=usuario&&!bloqueado&&!temporalVencida&&await bcrypt.compare(req.body.clave,usuario.clave)
  if (!usuario||!usuario.activo||!usuario.correoverificado||bloqueado||temporalVencida||!claveCorrecta) {
    if (usuario&&!bloqueado) {
      await BaseDatos.query(
        `UPDATE usuarios SET intentosfallidos=intentosfallidos+1,
         bloqueadohasta=CASE WHEN intentosfallidos+1>=5 THEN NOW()+INTERVAL '15 minutes' ELSE bloqueadohasta END,
         actualizadoen=NOW() WHERE id=$1`,
        [usuario.id]
      )
    }
    return res.status(401).json({mensaje:'Credenciales incorrectas o cuenta no activada'})
  }
  await BaseDatos.query('UPDATE usuarios SET intentosfallidos=0,bloqueadohasta=NULL,actualizadoen=NOW() WHERE id=$1',[usuario.id])
  const sesion=FirmarSesion(usuario)
  res.cookie('SesionSegura',sesion.token,OpcionesCookie())
  await RegistrarAuditoria(usuario.id,'IniciarSesion','Usuario',usuario.id,{},req.ip)
  res.json({usuario:UsuarioPublico(usuario,sesion.proteccion)})
})

Api.use(Autenticar)

Api.get('/sesion',(req,res)=>res.json({usuario:req.usuario}))

Api.use(ExigirProteccion)

Api.post('/salir',async (req,res)=>{
  const opciones=OpcionesCookie()
  delete opciones.maxAge
  res.clearCookie('SesionSegura',opciones)
  await RegistrarAuditoria(req.usuario.id,'CerrarSesion','Usuario',req.usuario.id,{},req.ip)
  res.status(204).end()
})

Api.post('/cambiarclave',Validar(EsquemaCambioClave),async (req,res)=>{
  const usuario=(await BaseDatos.query('SELECT * FROM usuarios WHERE id=$1',[req.usuario.id])).rows[0]
  if (!await bcrypt.compare(req.body.claveactual,usuario.clave)) return res.status(400).json({mensaje:'Contraseña actual incorrecta'})
  const nueva=await bcrypt.hash(req.body.clavenueva,12)
  await BaseDatos.query(
    `UPDATE usuarios SET clave=$1,debecambiarclave=false,codigovence=NULL,versionsesion=versionsesion+1,actualizadoen=NOW() WHERE id=$2`,
    [nueva,usuario.id]
  )
  const actualizado={...usuario,versionsesion:Number(usuario.versionsesion)+1,debecambiarclave:false}
  const sesion=FirmarSesion(actualizado)
  res.cookie('SesionSegura',sesion.token,OpcionesCookie())
  await RegistrarAuditoria(usuario.id,'CambiarClave','Usuario',usuario.id,{},req.ip)
  res.json({usuario:UsuarioPublico(actualizado,sesion.proteccion)})
})

Api.use(ExigirClaveActualizada)

Api.get('/empresa',Operacion,async (_,res)=>{
  const registro=(await BaseDatos.query('SELECT * FROM configuracionempresa WHERE id=1')).rows[0]
  res.json(registro)
})

Api.put('/empresa',Administrador,Validar(EsquemaEmpresa),async (req,res)=>{
  const d=req.body
  const registro=(await BaseDatos.query(
    `UPDATE configuracionempresa SET nombrecomercial=$1,razonsocial=$2,ruc=$3,direccion=$4,
     telefono=$5,correo=$6,serie=$7,actualizadoen=NOW() WHERE id=1 RETURNING *`,
    [d.nombrecomercial,d.razonsocial,d.ruc,d.direccion,d.telefono,d.correo,d.serie]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,'ConfigurarEmpresa','ConfiguracionEmpresa',1,{ruc:d.ruc,serie:d.serie},req.ip)
  res.json(registro)
})

Api.get('/resumen',Operacion,async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    await EvaluarInicioMensual(cliente,req.usuario.id)
    const resultado=(await cliente.query(`
      SELECT
        (SELECT COUNT(*) FROM productos WHERE activo=true) productos,
        (SELECT COUNT(*) FROM productos WHERE activo=true AND stockactual-stockreservado<=stockminimo) alertas,
        (SELECT COUNT(*) FROM cotizaciones WHERE estado IN ('Pendiente','Contactada','ComprobanteAdjunto')) cotizaciones,
        (SELECT COUNT(*) FROM reabastecimientos WHERE estado IN ('Pendiente','ProveedorSeleccionado','PagoRegistrado','EnTransito')) reabastecimientos,
        (SELECT COUNT(*) FROM cotizaciones WHERE estado='EnPreparacion') preparacion,
        (SELECT COUNT(*) FROM notificaciones WHERE estado<>'Enviado') correospendientes,
        (SELECT COALESCE(MAX(realizadoen),'-infinity'::timestamptz)+INTERVAL '15 days'<=NOW() FROM auditoriasinventario) auditoriavencida,
        (SELECT MAX(proximafecha) FROM auditoriasinventario) proximafechaauditoria
    `)).rows[0]
    await cliente.query('COMMIT')
    res.json(resultado)
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
})

Api.get('/productos',Almacen,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT p.*,c.nombre categoria,GREATEST(p.stockactual-p.stockreservado,0) stockdisponible,
      ROUND(p.precioventa*(1-p.descuentoventa/100),2) preciofinal
    FROM productos p JOIN categorias c ON c.id=p.categoriaid ORDER BY p.id DESC
  `)
  res.json(datos.rows)
})

Api.post('/productos',Administrador,Validar(EsquemaProducto),async (req,res)=>{
  const d=req.body
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const registro=(await cliente.query(
      `INSERT INTO productos(codigo,nombre,descripcion,categoriaid,tipoproducto,material,grosor,dimensiones,maximopedido,precioventa,preciocompra,descuentoventa,descuentocompra,stockactual,stockminimo,stockmensual,imagen)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [d.codigo,d.nombre,d.descripcion,d.categoriaid,d.tipoproducto,d.material,d.grosor,d.dimensiones,d.maximopedido,d.precioventa,d.preciocompra,d.descuentoventa,d.descuentocompra,d.stockactual,d.stockminimo,d.stockmensual,d.imagen]
    )).rows[0]
    await EvaluarProducto(cliente,registro.id,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'CrearProducto','Producto',registro.id,{codigo:registro.codigo},req.ip,cliente)
    await cliente.query('COMMIT')
    res.status(201).json(registro)
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally { cliente.release() }
})

Api.put('/productos/:id',Administrador,ValidarIdentificador,Validar(EsquemaProducto),async (req,res)=>{
  const d=req.body
  const actual=(await BaseDatos.query('SELECT stockreservado FROM productos WHERE id=$1',[req.params.id])).rows[0]
  if (!actual) return res.status(404).json({mensaje:'Producto no encontrado'})
  if (Number(d.stockactual)<Number(actual.stockreservado)) return res.status(400).json({mensaje:'El stock no puede ser menor al reservado'})
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const registro=(await cliente.query(
      `UPDATE productos SET codigo=$1,nombre=$2,descripcion=$3,categoriaid=$4,tipoproducto=$5,material=$6,
       grosor=$7,dimensiones=$8,maximopedido=$9,precioventa=$10,preciocompra=$11,
       descuentoventa=$12,descuentocompra=$13,stockactual=$14,stockminimo=$15,stockmensual=$16,imagen=$17,actualizadoen=NOW()
       WHERE id=$18 RETURNING *`,
      [d.codigo,d.nombre,d.descripcion,d.categoriaid,d.tipoproducto,d.material,d.grosor,d.dimensiones,d.maximopedido,d.precioventa,d.preciocompra,d.descuentoventa,d.descuentocompra,d.stockactual,d.stockminimo,d.stockmensual,d.imagen,req.params.id]
    )).rows[0]
    await EvaluarProducto(cliente,registro.id,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'EditarProducto','Producto',registro.id,{codigo:registro.codigo},req.ip,cliente)
    await cliente.query('COMMIT')
    res.json(registro)
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally { cliente.release() }
})

Api.patch('/productos/:id/estado',Administrador,ValidarIdentificador,Validar(EsquemaConfirmacion),async (req,res)=>{
  const registro=(await BaseDatos.query('UPDATE productos SET activo=NOT activo,actualizadoen=NOW() WHERE id=$1 RETURNING id,activo',[req.params.id])).rows[0]
  if (NoEncontrado(res,registro)) return
  await RegistrarAuditoria(req.usuario.id,registro.activo?'ActivarProducto':'DesactivarProducto','Producto',registro.id,{},req.ip)
  res.json(registro)
})

Api.get('/movimientos',Almacen,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT m.*,p.nombre producto,u.nombres||' '||u.apellidos usuario
    FROM movimientos m JOIN productos p ON p.id=m.productoid
    LEFT JOIN usuarios u ON u.id=m.usuarioid ORDER BY m.creadoen DESC LIMIT 300
  `)
  res.json(datos.rows)
})

Api.post('/movimientos',Almacen,Validar(EsquemaMovimiento),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const producto=(await cliente.query('SELECT * FROM productos WHERE id=$1 AND activo=true FOR UPDATE',[req.body.productoid])).rows[0]
    if (!producto) throw new Error('Producto no encontrado')
    const signo=['Entrada','Ajuste'].includes(req.body.tipo)?1:-1
    const nuevo=Number(producto.stockactual)+signo*req.body.cantidad
    if (nuevo<Number(producto.stockreservado)) throw new Error('El movimiento afectaría stock reservado')
    if (nuevo>1000) throw new Error('El stock máximo permitido es 1000')
    await cliente.query('UPDATE productos SET stockactual=$1,actualizadoen=NOW() WHERE id=$2',[nuevo,producto.id])
    const movimiento=(await cliente.query(
      `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [producto.id,req.body.tipo,req.body.cantidad,req.body.motivo,req.usuario.id]
    )).rows[0]
    if (signo>0) await CompletarReservasPendientes(cliente,producto.id,req.usuario.id)
    await EvaluarProducto(cliente,producto.id,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'RegistrarMovimiento','Producto',producto.id,{tipo:req.body.tipo,cantidad:req.body.cantidad},req.ip,cliente)
    await cliente.query('COMMIT')
    res.status(201).json(movimiento)
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(400).json({mensaje:error.message})
  } finally {
    cliente.release()
  }
})

Api.get('/proveedores',Administrador,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT p.*,
      COALESCE(json_agg(json_build_object(
        'id',pp.id,'productoid',pp.productoid,'producto',pr.nombre,'codigo',pr.codigo,
        'preciohabitual',pp.preciohabitual,'descuentolanzamiento',pp.descuentolanzamiento,
        'precioefectivo',ROUND(pp.preciohabitual*(1-pp.descuentolanzamiento/100),2),
        'diasentrega',pp.diasentrega,'pedidosanteriores',pp.pedidosanteriores,
        'puntaje',pp.puntaje,'activo',pp.activo
      ) ORDER BY pr.nombre) FILTER (WHERE pp.id IS NOT NULL),'[]') productos
    FROM proveedores p
    LEFT JOIN proveedorproductos pp ON pp.proveedorid=p.id
    LEFT JOIN productos pr ON pr.id=pp.productoid
    GROUP BY p.id ORDER BY p.razonsocial
  `)
  res.json(datos.rows)
})

Api.post('/proveedores',Administrador,Validar(EsquemaProveedor),async (req,res)=>{
  const d=req.body
  const registro=(await BaseDatos.query(
    `INSERT INTO proveedores(razonsocial,ruc,contacto,telefono,correo,ubicacion)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [d.razonsocial,d.ruc,d.contacto,d.telefono,d.correo,d.ubicacion]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,'CrearProveedor','Proveedor',registro.id,{ruc:registro.ruc},req.ip)
  res.status(201).json(registro)
})

Api.put('/proveedores/:id',Administrador,ValidarIdentificador,Validar(EsquemaProveedor),async (req,res)=>{
  const d=req.body
  const registro=(await BaseDatos.query(
    `UPDATE proveedores SET razonsocial=$1,ruc=$2,contacto=$3,telefono=$4,correo=$5,ubicacion=$6
     WHERE id=$7 RETURNING *`,
    [d.razonsocial,d.ruc,d.contacto,d.telefono,d.correo,d.ubicacion,req.params.id]
  )).rows[0]
  if (NoEncontrado(res,registro)) return
  await RegistrarAuditoria(req.usuario.id,'EditarProveedor','Proveedor',registro.id,{},req.ip)
  res.json(registro)
})

Api.patch('/proveedores/:id/estado',Administrador,ValidarIdentificador,async (req,res)=>{
  const registro=(await BaseDatos.query('UPDATE proveedores SET activo=NOT activo WHERE id=$1 RETURNING id,activo',[req.params.id])).rows[0]
  if (NoEncontrado(res,registro)) return
  await RegistrarAuditoria(req.usuario.id,'CambiarEstadoProveedor','Proveedor',registro.id,{activo:registro.activo},req.ip)
  res.json(registro)
})

Api.post('/proveedores/:id/productos',Administrador,ValidarIdentificador,Validar(EsquemaProveedorProducto),async (req,res)=>{
  const d=req.body
  const registro=(await BaseDatos.query(
    `INSERT INTO proveedorproductos(proveedorid,productoid,preciohabitual,descuentolanzamiento,diasentrega,pedidosanteriores,puntaje)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (proveedorid,productoid) DO UPDATE SET preciohabitual=EXCLUDED.preciohabitual,
       descuentolanzamiento=EXCLUDED.descuentolanzamiento,diasentrega=EXCLUDED.diasentrega,
       pedidosanteriores=EXCLUDED.pedidosanteriores,puntaje=EXCLUDED.puntaje,activo=true
     RETURNING *`,
    [req.params.id,d.productoid,d.preciohabitual,d.descuentolanzamiento,d.diasentrega,d.pedidosanteriores,d.puntaje]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,'VincularProductoProveedor','Proveedor',req.params.id,{productoid:d.productoid},req.ip)
  res.status(201).json(registro)
})

Api.delete('/proveedores/:id/productos/:vinculoid',Administrador,ValidarIdentificador,async (req,res)=>{
  if (!/^\d{1,10}$/.test(req.params.vinculoid||'')) return res.status(400).json({mensaje:'Identificador inválido'})
  const registro=(await BaseDatos.query(
    'UPDATE proveedorproductos SET activo=false WHERE id=$1 AND proveedorid=$2 RETURNING id,productoid',
    [Number(req.params.vinculoid),req.params.id]
  )).rows[0]
  if (NoEncontrado(res,registro)) return
  await RegistrarAuditoria(req.usuario.id,'DesvincularProductoProveedor','Proveedor',req.params.id,{productoid:registro.productoid},req.ip)
  res.status(204).end()
})

Api.get('/usuarios',Administrador,async (_,res)=>{
  const datos=await BaseDatos.query(
    `SELECT id,nombres,apellidos,dni,correo,rol,activo,correoverificado,debecambiarclave,
       codigovence,intentosfallidos,bloqueadohasta,metodoactivacion,esrespaldo,creadoen
     FROM usuarios ORDER BY id DESC`
  )
  res.json(datos.rows)
})

Api.get('/usuarios/dni/:dni',Administrador,LimiteConsultaDni,async (req,res)=>{
  const dni=String(req.params.dni||'')
  if (!/^\d{8}$/.test(dni)) return res.status(400).json({mensaje:'DNI inválido'})
  try {
    const resultado=await ConsultarDni(dni)
    if (!resultado) return res.status(404).json({mensaje:'DNI erróneo'})
    if (!EsMayorDeEdad(resultado.fechanacimiento)) return res.status(403).json({mensaje:'DNI no permitido por restricción de edad'})
    const basecorreo=PrefijoCorreo(resultado.nombres,resultado.apellidos)
    let correo=null
    for (let longitud=1;longitud<=dni.length;longitud++) {
      const candidato=`${basecorreo}${dni.slice(-longitud)}@elima.pe`
      const existe=(await BaseDatos.query('SELECT 1 FROM usuarios WHERE correo=$1',[candidato])).rows.length
      if (!existe) { correo=candidato; break }
    }
    if (!correo) return res.status(409).json({mensaje:'Ya existe un trabajador registrado con estos datos'})
    res.json({nombres:CapitalizarTexto(resultado.nombres),apellidos:CapitalizarTexto(resultado.apellidos),correo})
  } catch (fallo) {
    console.error('ConsultarDni:',fallo.message)
    res.status(502).json({mensaje:'No se pudo validar el DNI, intente nuevamente'})
  }
})

Api.post('/usuarios',Administrador,Validar(EsquemaUsuario),async (req,res)=>{
  const credenciales=CrearCredenciales(req.body.dni,req.body.apellidos)
  const clave=await bcrypt.hash(credenciales.temporal,12)
  const codigo=await bcrypt.hash(credenciales.codigo,10)
  const registro=(await BaseDatos.query(
    `INSERT INTO usuarios(nombres,apellidos,dni,correo,clave,rol,correoverificado,debecambiarclave,
       codigoverificacion,codigovence,metodoactivacion)
     VALUES($1,$2,$3,$4,$5,$6,false,true,$7,NOW()+INTERVAL '30 minutes','Pendiente')
     RETURNING id,nombres,apellidos,dni,correo,rol,activo,correoverificado,metodoactivacion`,
    [req.body.nombres,req.body.apellidos,req.body.dni,req.body.correo,clave,req.body.rol,codigo]
  )).rows[0]
  const cuerpo=`Su cuenta de ELIM-Almacén fue creada.\nCódigo de verificación: ${credenciales.codigo}\nContraseña temporal: ${credenciales.temporal}\nActive su cuenta desde el portal de trabajadores.`
  const correo=await EnviarCorreo('Trabajador',registro.correo,'Activación de cuenta ELIM-Almacén',cuerpo,null,'Credenciales de activación enviadas al trabajador')
  await RegistrarAuditoria(req.usuario.id,'CrearUsuario','Usuario',registro.id,{rol:registro.rol,correo:registro.correo},req.ip)
  res.status(201).json({
    usuario:registro,
    correoestado:correo.estado,
    credenciales:CredencialesEntregables(registro.correo,credenciales,correo.estado)
  })
})

Api.post('/usuarios/:id/reenviar',Administrador,ValidarIdentificador,Validar(EsquemaConfirmacion),async (req,res)=>{
  const usuario=(await BaseDatos.query('SELECT * FROM usuarios WHERE id=$1 AND activo=true',[req.params.id])).rows[0]
  if (!usuario) return res.status(404).json({mensaje:'Usuario no encontrado o desactivado'})
  if (usuario.esrespaldo) return res.status(400).json({mensaje:'La cuenta de recuperación está protegida'})
  if (usuario.correoverificado) return res.status(400).json({mensaje:'La cuenta ya está activada'})
  const credenciales=CrearCredenciales(usuario.dni,usuario.apellidos)
  const clave=await bcrypt.hash(credenciales.temporal,12)
  const codigo=await bcrypt.hash(credenciales.codigo,10)
  await BaseDatos.query(
    `UPDATE usuarios SET clave=$1,codigoverificacion=$2,codigovence=NOW()+INTERVAL '30 minutes',
       debecambiarclave=true,metodoactivacion='Pendiente',intentosfallidos=0,bloqueadohasta=NULL,
       versionsesion=versionsesion+1,actualizadoen=NOW() WHERE id=$3`,
    [clave,codigo,usuario.id]
  )
  const cuerpo=`Nuevo código: ${credenciales.codigo}\nNueva contraseña temporal: ${credenciales.temporal}`
  const correo=await EnviarCorreo('Trabajador',usuario.correo,'Nuevo código de activación',cuerpo,null,'Nuevas credenciales de activación enviadas al trabajador')
  await RegistrarAuditoria(req.usuario.id,'GenerarCredencialesActivacion','Usuario',usuario.id,{correo:usuario.correo},req.ip)
  res.json({
    correoestado:correo.estado,
    credenciales:CredencialesEntregables(usuario.correo,credenciales,correo.estado)
  })
})

Api.post('/usuarios/:id/activar-manual',Administrador,ValidarIdentificador,Validar(EsquemaConfirmacion),async (req,res)=>{
  const usuario=(await BaseDatos.query('SELECT * FROM usuarios WHERE id=$1',[req.params.id])).rows[0]
  if (NoEncontrado(res,usuario)) return
  if (usuario.esrespaldo) return res.status(400).json({mensaje:'La cuenta de recuperación está protegida'})
  if (!usuario.activo) return res.status(409).json({mensaje:'Use Reactivar para una cuenta desactivada'})
  if (usuario.correoverificado&&!usuario.debecambiarclave) return res.status(409).json({mensaje:'La cuenta ya está activa'})
  const credenciales=CrearCredenciales(usuario.dni,usuario.apellidos)
  const clave=await bcrypt.hash(credenciales.temporal,12)
  const accion=usuario.correoverificado?'RenovarClaveTemporal':'ActivarUsuarioManual'
  const registro=(await BaseDatos.query(
    `UPDATE usuarios SET clave=$1,correoverificado=true,debecambiarclave=true,codigoverificacion=NULL,
       codigovence=NOW()+INTERVAL '30 minutes',metodoactivacion='Administrador',intentosfallidos=0,
       bloqueadohasta=NULL,versionsesion=versionsesion+1,actualizadoen=NOW()
     WHERE id=$2 RETURNING id,activo,correoverificado,debecambiarclave,metodoactivacion,codigovence`,
    [clave,usuario.id]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,accion,'Usuario',usuario.id,{correo:usuario.correo},req.ip)
  res.json({usuario:registro,credenciales:CredencialTemporal(usuario.correo,credenciales)})
})

Api.patch('/usuarios/:id/desactivar',Administrador,ValidarIdentificador,Validar(EsquemaConfirmacion),async (req,res)=>{
  if (req.params.id===req.usuario.id) return res.status(400).json({mensaje:'No puede desactivar su propia cuenta'})
  const objetivo=(await BaseDatos.query('SELECT id,rol,activo,esrespaldo FROM usuarios WHERE id=$1',[req.params.id])).rows[0]
  if (NoEncontrado(res,objetivo)) return
  if (objetivo.esrespaldo) return res.status(400).json({mensaje:'La cuenta de recuperación está protegida'})
  if (!objetivo.activo) return res.status(409).json({mensaje:'La cuenta ya está desactivada'})
  if (objetivo.rol==='Administrador') {
    const restantes=Number((await BaseDatos.query(
      `SELECT COUNT(*) cantidad FROM usuarios WHERE rol='Administrador' AND activo=true AND id<>$1`,
      [objetivo.id]
    )).rows[0].cantidad)
    if (restantes<1) return res.status(409).json({mensaje:'Debe permanecer al menos un administrador activo'})
  }
  const registro=(await BaseDatos.query(
    `UPDATE usuarios SET activo=false,codigoverificacion=NULL,codigovence=NULL,intentosfallidos=0,
       bloqueadohasta=NULL,versionsesion=versionsesion+1,actualizadoen=NOW()
     WHERE id=$1 RETURNING id,activo`,
    [objetivo.id]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,'DesactivarUsuario','Usuario',registro.id,{activo:false},req.ip)
  res.json(registro)
})

Api.post('/usuarios/:id/reactivar',Administrador,ValidarIdentificador,Validar(EsquemaConfirmacion),async (req,res)=>{
  const usuario=(await BaseDatos.query('SELECT * FROM usuarios WHERE id=$1',[req.params.id])).rows[0]
  if (NoEncontrado(res,usuario)) return
  if (usuario.esrespaldo) return res.status(400).json({mensaje:'La cuenta de recuperación está protegida'})
  if (usuario.activo) return res.status(409).json({mensaje:'La cuenta ya está activa'})
  const credenciales=CrearCredenciales(usuario.dni,usuario.apellidos)
  const clave=await bcrypt.hash(credenciales.temporal,12)
  const registro=(await BaseDatos.query(
    `UPDATE usuarios SET activo=true,clave=$1,correoverificado=true,debecambiarclave=true,
       codigoverificacion=NULL,codigovence=NOW()+INTERVAL '30 minutes',metodoactivacion='Administrador',
       intentosfallidos=0,bloqueadohasta=NULL,versionsesion=versionsesion+1,actualizadoen=NOW()
     WHERE id=$2 RETURNING id,activo,correoverificado,debecambiarclave,metodoactivacion,codigovence`,
    [clave,usuario.id]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,'ReactivarUsuario','Usuario',usuario.id,{correo:usuario.correo},req.ip)
  res.json({usuario:registro,credenciales:CredencialTemporal(usuario.correo,credenciales)})
})

Api.patch('/usuarios/:id/desbloquear',Administrador,ValidarIdentificador,Validar(EsquemaConfirmacion),async (req,res)=>{
  const objetivo=(await BaseDatos.query('SELECT id,activo,intentosfallidos,bloqueadohasta FROM usuarios WHERE id=$1',[req.params.id])).rows[0]
  if (NoEncontrado(res,objetivo)) return
  if (!objetivo.activo) return res.status(409).json({mensaje:'La cuenta está desactivada'})
  if (!objetivo.bloqueadohasta&&Number(objetivo.intentosfallidos)===0) return res.status(409).json({mensaje:'La cuenta no está bloqueada'})
  const registro=(await BaseDatos.query(
    `UPDATE usuarios SET intentosfallidos=0,bloqueadohasta=NULL,versionsesion=versionsesion+1,actualizadoen=NOW()
     WHERE id=$1 RETURNING id,activo,bloqueadohasta`,
    [req.params.id]
  )).rows[0]
  await RegistrarAuditoria(req.usuario.id,'DesbloquearUsuario','Usuario',registro.id,{},req.ip)
  res.json(registro)
})

Api.get('/cotizaciones',Operacion,async (req,res)=>{
  const filtro=req.usuario.rol==='JefeAlmacen'
    ? "WHERE c.estado IN ('PagoVerificado','PendienteReabastecimiento','EnPreparacion','ListaRecojo','Entregada')"
    : ''
  const datos=await BaseDatos.query(`
    SELECT c.*,
      (SELECT b.codigo FROM facturas b WHERE b.cotizacionid=c.id) facturacodigo,
      (SELECT b.serie||'-'||LPAD(b.numero::text,8,'0') FROM facturas b WHERE b.cotizacionid=c.id) facturanumero,
      COALESCE(json_agg(json_build_object(
        'id',d.id,'productoid',d.productoid,'producto',p.nombre,'codigo',p.codigo,
        'cantidad',d.cantidad,'cantidadreservada',d.cantidadreservada,'precio',d.precio,
        'descuentofijo',d.descuentofijo,'descuentovolumen',d.descuentovolumen,
        'descuento',d.descuento,'subtotalbase',ROUND(d.cantidad*d.precio,2),
        'subtotal',ROUND(d.cantidad*d.precio*(1-d.descuento/100),2)
      ) ORDER BY d.id) FILTER (WHERE d.id IS NOT NULL),'[]') detalles
    FROM cotizaciones c
    LEFT JOIN detallecotizacion d ON d.cotizacionid=c.id
    LEFT JOIN productos p ON p.id=d.productoid
    ${filtro}
    GROUP BY c.id ORDER BY c.creadoen DESC LIMIT 300
  `)
  res.json(datos.rows)
})

Api.get('/cotizaciones/:id/historial',Operacion,ValidarIdentificador,async (req,res)=>{
  const datos=await BaseDatos.query(`
    SELECT h.*,u.nombres||' '||u.apellidos usuario
    FROM historialcotizaciones h LEFT JOIN usuarios u ON u.id=h.usuarioid
    WHERE h.cotizacionid=$1 ORDER BY h.creadoen`,[req.params.id])
  res.json(datos.rows)
})

Api.post('/cotizaciones/:id/contactar',Ventas,ValidarIdentificador,Validar(EsquemaContactoCotizacion),async (req,res)=>{
  const registro=(await BaseDatos.query(
    `UPDATE cotizaciones SET estado='Contactada',asesorid=$1,notacontacto=$2,contactadoen=NOW(),actualizadoen=NOW()
     WHERE id=$3 AND estado='Pendiente' RETURNING *`,
    [req.usuario.id,req.body.nota,req.params.id]
  )).rows[0]
  if (!registro) return res.status(409).json({mensaje:'La cotización no está pendiente'})
  await RegistrarHistorialCotizacion(BaseDatos,registro.id,'Pendiente','Contactada',req.body.nota,req.usuario.id)
  await RegistrarAuditoria(req.usuario.id,'ContactarCliente','Cotizacion',registro.id,{},req.ip)
  res.json(await CotizacionCompleta(registro.id))
})

Api.post('/cotizaciones/:id/comprobante',Ventas,ValidarIdentificador,Validar(EsquemaComprobanteCotizacion),async (req,res)=>{
  let archivo
  try { archivo=PrepararArchivo(req.body.archivo) } catch (error) { return res.status(400).json({mensaje:error.message}) }
  const anterior=(await BaseDatos.query(
    `SELECT estado FROM cotizaciones WHERE id=$1 AND estado IN ('Contactada','PagoRechazado')`,[req.params.id]
  )).rows[0]
  if (!anterior) return res.status(409).json({mensaje:'Primero debe registrar el contacto con el cliente'})
  const registro=(await BaseDatos.query(
    `UPDATE cotizaciones SET estado='ComprobanteAdjunto',comprobante=$1,comprobantemime=$2,
     comprobantenombre=$3,comprobanteen=NOW(),actualizadoen=NOW()
     WHERE id=$4 RETURNING *`,
    [archivo.contenido,archivo.tipo,archivo.nombre,req.params.id]
  )).rows[0]
  await RegistrarHistorialCotizacion(BaseDatos,registro.id,anterior.estado,'ComprobanteAdjunto','Comprobante registrado',req.usuario.id)
  await RegistrarAuditoria(req.usuario.id,'AdjuntarComprobanteCliente','Cotizacion',registro.id,{nombre:archivo.nombre},req.ip)
  res.json(await CotizacionCompleta(registro.id))
})

Api.get('/cotizaciones/:id/comprobante',Ventas,ValidarIdentificador,async (req,res)=>{
  const registro=(await BaseDatos.query(
    `SELECT comprobante contenido,comprobantemime tipo,comprobantenombre nombre
     FROM cotizaciones WHERE id=$1`,[req.params.id])).rows[0]
  EnviarArchivo(res,registro,'comprobante')
})

Api.post('/cotizaciones/:id/verificarpago',Administrador,ValidarIdentificador,Validar(EsquemaVerificacionPago),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const cotizacion=(await cliente.query('SELECT * FROM cotizaciones WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0]
    if (!cotizacion||cotizacion.estado!=='ComprobanteAdjunto') throw new Error('La cotización no está lista para verificación')
    if (!req.body.aprobado) {
      await cliente.query(
        `UPDATE cotizaciones SET estado='PagoRechazado',verificadorid=$1,verificadoen=NOW(),observacionpago=$2,actualizadoen=NOW() WHERE id=$3`,
        [req.usuario.id,req.body.observacion,cotizacion.id]
      )
      await RegistrarHistorialCotizacion(cliente,cotizacion.id,cotizacion.estado,'PagoRechazado',req.body.observacion,req.usuario.id)
    } else {
      await ReservarCotizacion(cliente,cotizacion.id,req.usuario.id,req.body.observacion)
    }
    await RegistrarAuditoria(req.usuario.id,'VerificarPago','Cotizacion',cotizacion.id,{aprobado:req.body.aprobado},req.ip,cliente)
    await cliente.query('COMMIT')
    res.json(await CotizacionCompleta(cotizacion.id))
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally {
    cliente.release()
  }
})

Api.post('/cotizaciones/:id/rechazar',Ventas,ValidarIdentificador,Validar(EsquemaObservacion),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const cotizacion=(await cliente.query('SELECT * FROM cotizaciones WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0]
    if (!cotizacion||['ListaRecojo','Entregada','Rechazada'].includes(cotizacion.estado)) throw new Error('No se puede rechazar en el estado actual')
    if (req.usuario.rol==='AsesorVentas'&&!['Pendiente','Contactada','ComprobanteAdjunto','PagoRechazado'].includes(cotizacion.estado)) throw new Error('Solo el administrador puede rechazar una cotización aprobada')
    const compras=(await cliente.query(
      `SELECT * FROM reabastecimientos WHERE cotizacionid=$1 AND estado IN ('ProveedorSeleccionado','PagoRegistrado','EnTransito') FOR UPDATE`,
      [cotizacion.id]
    )).rows
    if (compras.length) throw new Error('No se puede rechazar porque existe una compra en curso')
    const cancelados=(await cliente.query(
      `UPDATE reabastecimientos SET estado='Cancelado',actualizadoen=NOW()
       WHERE cotizacionid=$1 AND estado='Pendiente' RETURNING id`,[cotizacion.id]
    )).rows
    for (const item of cancelados) await RegistrarHistorialReabastecimiento(cliente,item.id,'Pendiente','Cancelado','Cotización rechazada',req.usuario.id)
    await LiberarReservasCotizacion(cliente,cotizacion.id,req.usuario.id,'Cotización rechazada')
    await cliente.query("UPDATE cotizaciones SET estado='Rechazada',actualizadoen=NOW() WHERE id=$1",[cotizacion.id])
    await RegistrarHistorialCotizacion(cliente,cotizacion.id,cotizacion.estado,'Rechazada',req.body.observacion,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'RechazarCotizacion','Cotizacion',cotizacion.id,{},req.ip,cliente)
    await cliente.query('COMMIT')
    res.json(await CotizacionCompleta(cotizacion.id))
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.post('/cotizaciones/:id/lista',Almacen,ValidarIdentificador,Validar(EsquemaObservacion),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  let cotizacion
  try {
    await cliente.query('BEGIN')
    cotizacion=await DespacharCotizacion(cliente,req.params.id,req.usuario.id,req.body.observacion)
    await RegistrarAuditoria(req.usuario.id,'PrepararPedido','Cotizacion',cotizacion.id,{},req.ip,cliente)
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK')
    return res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
  const correo=await EnviarCorreo('Cliente',cotizacion.correo,`Pedido ${cotizacion.id} listo para recojo`,`Hola ${cotizacion.cliente}. Sus productos de la cotización ${cotizacion.id} están listos para recoger.`)
  if (correo.estado==='Enviado') await BaseDatos.query('UPDATE cotizaciones SET notificacionlistaen=NOW() WHERE id=$1',[cotizacion.id])
  res.json({...await CotizacionCompleta(cotizacion.id),correoestado:correo.estado})
})

Api.post('/cotizaciones/:id/entregar',Operacion,ValidarIdentificador,Validar(EsquemaObservacion),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const registro=(await cliente.query(
      `UPDATE cotizaciones SET estado='Entregada',actualizadoen=NOW()
       WHERE id=$1 AND estado='ListaRecojo' RETURNING *`,[req.params.id])).rows[0]
    if (!registro) throw new Error('El pedido no está listo para recojo')
    await RegistrarHistorialCotizacion(cliente,registro.id,'ListaRecojo','Entregada',req.body.observacion,req.usuario.id)
    const factura=await CrearFactura(cliente,registro.id,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'EntregarPedido','Cotizacion',registro.id,{facturacodigo:factura.codigo},req.ip,cliente)
    await cliente.query('COMMIT')
    res.json(await CotizacionCompleta(registro.id))
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.post('/cotizaciones/:id/factura',Operacion,ValidarIdentificador,async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const factura=await CrearFactura(cliente,req.params.id,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'GenerarFactura','Cotizacion',req.params.id,{codigo:factura.codigo},req.ip,cliente)
    await cliente.query('COMMIT')
    res.json({codigo:factura.codigo,numero:`${factura.serie}-${String(factura.numero).padStart(8,'0')}`})
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.get('/cotizaciones/:id/factura/pdf',Operacion,ValidarIdentificador,async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const factura=await CrearFactura(cliente,req.params.id,req.usuario.id)
    await cliente.query('COMMIT')
    const url=`${req.protocol}://${req.get('host')}/?verificarfactura=${encodeURIComponent(factura.codigo)}`
    const pdf=await GenerarPdfFactura(factura,url)
    res.set('Content-Type','application/pdf')
    res.set('Content-Disposition',`attachment; filename="factura-${factura.serie}-${String(factura.numero).padStart(8,'0')}.pdf"`)
    res.set('X-Content-Type-Options','nosniff')
    res.set('Cache-Control','no-store')
    res.send(pdf)
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.get('/reabastecimientos',Almacen,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT r.*,p.nombre producto,p.codigo,pr.razonsocial proveedor,
      COALESCE((SELECT COUNT(*) FROM proveedorproductos pp JOIN proveedores pv ON pv.id=pp.proveedorid WHERE pp.productoid=r.productoid AND pp.activo=true AND pv.activo=true),0)::int candidatos
    FROM reabastecimientos r JOIN productos p ON p.id=r.productoid
    LEFT JOIN proveedores pr ON pr.id=r.proveedorid
    ORDER BY r.creadoen DESC LIMIT 300
  `)
  res.json(datos.rows)
})

Api.post('/reabastecimientos',Administrador,Validar(EsquemaReabastecimientoManual),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const producto=(await cliente.query('SELECT id FROM productos WHERE id=$1 AND activo=true',[req.body.productoid])).rows[0]
    if (!producto) throw new Error('Producto no encontrado')
    const registro=await CrearReabastecimiento(cliente,{...req.body,motivo:'Manual',usuarioid:req.usuario.id})
    await RegistrarAuditoria(req.usuario.id,'CrearReabastecimiento','Reabastecimiento',registro.id,{},req.ip,cliente)
    await cliente.query('COMMIT')
    res.status(201).json(registro)
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(400).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.get('/reabastecimientos/:id/candidatos',Administrador,ValidarIdentificador,async (req,res)=>{
  const registro=(await BaseDatos.query('SELECT productoid FROM reabastecimientos WHERE id=$1',[req.params.id])).rows[0]
  if (!registro) return res.status(404).json({mensaje:'Reabastecimiento no encontrado'})
  const datos=await BaseDatos.query(`
    WITH candidatos AS (
      SELECT pp.*,p.razonsocial,p.ruc,p.correo,p.contacto,p.ubicacion,
        ROUND(pp.preciohabitual*(1-pp.descuentolanzamiento/100),2) precioevaluado
      FROM proveedorproductos pp JOIN proveedores p ON p.id=pp.proveedorid
      JOIN productos pr ON pr.id=pp.productoid
      WHERE pp.productoid=$1 AND pp.activo=true AND p.activo=true
    ), limites AS (
      SELECT MIN(precioevaluado) preciominimo,MAX(precioevaluado) preciomaximo,
        MIN(diasentrega) diasminimos,MAX(diasentrega) diasmaximos,MAX(pedidosanteriores) pedidosmaximos
      FROM candidatos
    ), puntuados AS (
      SELECT c.*,
        ROUND(
          (1-(c.precioevaluado-l.preciominimo)/GREATEST(l.preciomaximo-l.preciominimo,1))*40+
          (1-(c.diasentrega-l.diasminimos)::numeric/GREATEST(l.diasmaximos-l.diasminimos,1))*20+
          c.pedidosanteriores::numeric/GREATEST(l.pedidosmaximos,1)*10+
          c.puntaje/5*30,2
        ) puntajeseleccion
      FROM candidatos c CROSS JOIN limites l
    )
    SELECT *,puntajeseleccion=(SELECT MAX(puntajeseleccion) FROM puntuados) esmejor
    FROM puntuados ORDER BY puntajeseleccion DESC,razonsocial
  `,[registro.productoid])
  res.json(datos.rows)
})

Api.post('/reabastecimientos/:id/proveedor',Administrador,ValidarIdentificador,Validar(EsquemaSeleccionProveedor),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const reabastecimiento=(await cliente.query('SELECT * FROM reabastecimientos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0]
    if (!reabastecimiento||reabastecimiento.estado!=='Pendiente') throw new Error('Reabastecimiento no disponible')
    const candidato=(await cliente.query(
      `SELECT id FROM proveedorproductos WHERE proveedorid=$1 AND productoid=$2 AND activo=true`,
      [req.body.proveedorid,reabastecimiento.productoid]
    )).rows[0]
    if (!candidato) throw new Error('El proveedor no vende este producto')
    const orden=`OC-${String(reabastecimiento.id).padStart(6,'0')}-${new Date().getFullYear()}`
    const registro=(await cliente.query(
      `UPDATE reabastecimientos SET proveedorid=$1,estado='ProveedorSeleccionado',ordencompra=$2,
       observacion=$3,actualizadoen=NOW() WHERE id=$4 RETURNING *`,
      [req.body.proveedorid,orden,req.body.observacion,reabastecimiento.id]
    )).rows[0]
    await RegistrarHistorialReabastecimiento(cliente,registro.id,reabastecimiento.estado,'ProveedorSeleccionado',req.body.observacion,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'SeleccionarProveedor','Reabastecimiento',registro.id,{proveedorid:req.body.proveedorid},req.ip,cliente)
    await cliente.query('COMMIT')
    res.json(registro)
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.post('/reabastecimientos/:id/pago',Administrador,ValidarIdentificador,Validar(EsquemaPagoProveedor),async (req,res)=>{
  let archivo
  try { archivo=PrepararArchivo(req.body.archivo) } catch (error) { return res.status(400).json({mensaje:error.message}) }
  const cliente=await BaseDatos.connect()
  let registro
  let proveedor
  try {
    await cliente.query('BEGIN')
    const actual=(await cliente.query('SELECT * FROM reabastecimientos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0]
    if (!actual||actual.estado!=='ProveedorSeleccionado') throw new Error('Primero seleccione un proveedor')
    proveedor=(await cliente.query('SELECT * FROM proveedores WHERE id=$1',[actual.proveedorid])).rows[0]
    registro=(await cliente.query(
      `UPDATE reabastecimientos SET estado='EnTransito',comprobante=$1,comprobantemime=$2,comprobantenombre=$3,
       pagoen=NOW(),observacion=$4,actualizadoen=NOW() WHERE id=$5 RETURNING *`,
      [archivo.contenido,archivo.tipo,archivo.nombre,req.body.observacion,actual.id]
    )).rows[0]
    await RegistrarHistorialReabastecimiento(cliente,registro.id,actual.estado,'EnTransito',req.body.observacion,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'RegistrarPagoProveedor','Reabastecimiento',registro.id,{orden:registro.ordencompra},req.ip,cliente)
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK')
    return res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
  const correo=await EnviarCorreo('Proveedor',proveedor.correo,`Orden de compra ${registro.ordencompra}`,`Se adjunta el comprobante de pago de la orden ${registro.ordencompra}.`,archivo)
  res.json({...registro,correoestado:correo.estado})
})

Api.get('/reabastecimientos/:id/comprobante',Almacen,ValidarIdentificador,async (req,res)=>{
  const registro=(await BaseDatos.query(
    `SELECT comprobante contenido,comprobantemime tipo,comprobantenombre nombre
     FROM reabastecimientos WHERE id=$1`,[req.params.id])).rows[0]
  EnviarArchivo(res,registro,'pago')
})

Api.get('/recepciones',Almacen,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT rec.*,r.ordencompra,p.nombre producto,pr.razonsocial proveedor,u.nombres||' '||u.apellidos usuario
    FROM recepciones rec JOIN reabastecimientos r ON r.id=rec.reabastecimientoid
    JOIN productos p ON p.id=r.productoid JOIN proveedores pr ON pr.id=rec.proveedorid
    LEFT JOIN usuarios u ON u.id=rec.usuarioid ORDER BY rec.creadoen DESC LIMIT 200
  `)
  res.json(datos.rows)
})

Api.post('/recepciones',Almacen,Validar(EsquemaRecepcion),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const r=(await cliente.query('SELECT * FROM reabastecimientos WHERE id=$1 FOR UPDATE',[req.body.reabastecimientoid])).rows[0]
    if (!r||r.estado!=='EnTransito') throw new Error('La compra no está en tránsito')
    const productoRecepcion=(await cliente.query('SELECT stockactual FROM productos WHERE id=$1 FOR UPDATE',[r.productoid])).rows[0]
    if (Number(productoRecepcion.stockactual)+Number(req.body.recibida)>1000) throw new Error('La recepción superaría el stock máximo de 1000')
    if (req.body.recibida+req.body.faltantes+req.body.defectuosos!==Number(r.cantidadrequerida)) throw new Error('Las cantidades deben completar la orden')
    const estado=req.body.faltantes||req.body.defectuosos?'RecibidoObservado':'Recibido'
    const recepcion=(await cliente.query(
      `INSERT INTO recepciones(reabastecimientoid,proveedorid,solicitada,recibida,faltantes,defectuosos,observacion,usuarioid)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [r.id,r.proveedorid,r.cantidadrequerida,req.body.recibida,req.body.faltantes,req.body.defectuosos,req.body.observacion,req.usuario.id]
    )).rows[0]
    if (req.body.recibida>0) {
      await cliente.query('UPDATE productos SET stockactual=stockactual+$1,actualizadoen=NOW() WHERE id=$2',[req.body.recibida,r.productoid])
      await cliente.query(
        `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid,reabastecimientoid)
         VALUES($1,'Entrada',$2,$3,$4,$5)`,
        [r.productoid,req.body.recibida,`Recepción ${r.ordencompra}`,req.usuario.id,r.id]
      )
      await CompletarReservasPendientes(cliente,r.productoid,req.usuario.id)
    }
    await cliente.query("UPDATE reabastecimientos SET estado=$1,actualizadoen=NOW() WHERE id=$2",[estado,r.id])
    await cliente.query(
      `UPDATE proveedorproductos SET pedidosanteriores=pedidosanteriores+1
       WHERE proveedorid=$1 AND productoid=$2`,[r.proveedorid,r.productoid]
    )
    await RegistrarHistorialReabastecimiento(cliente,r.id,r.estado,estado,req.body.observacion,req.usuario.id)
    if (req.body.faltantes+req.body.defectuosos>0) {
      await CrearReabastecimiento(cliente,{
        productoid:r.productoid,motivo:'Manual',cantidadrequerida:req.body.faltantes+req.body.defectuosos,
        observacion:`Reposición por observaciones de ${r.ordencompra}`,usuarioid:req.usuario.id
      })
    }
    const pendientes=(await cliente.query(`
      SELECT d.cotizacionid,d.cantidad-d.cantidadreservada faltante
      FROM detallecotizacion d JOIN cotizaciones c ON c.id=d.cotizacionid
      WHERE d.productoid=$1 AND c.estado='PendienteReabastecimiento' AND d.cantidadreservada<d.cantidad`,[r.productoid])).rows
    for (const pendiente of pendientes) {
      await CrearReabastecimiento(cliente,{
        productoid:r.productoid,cotizacionid:pendiente.cotizacionid,motivo:'Cotizacion',cantidadrequerida:pendiente.faltante,
        observacion:`Faltante restante de cotización ${pendiente.cotizacionid}`,usuarioid:req.usuario.id
      })
    }
    await EvaluarProducto(cliente,r.productoid,req.usuario.id)
    await RegistrarAuditoria(req.usuario.id,'RegistrarRecepcion','Reabastecimiento',r.id,{recibida:req.body.recibida,faltantes:req.body.faltantes,defectuosos:req.body.defectuosos},req.ip,cliente)
    await cliente.query('COMMIT')
    res.status(201).json(recepcion)
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.get('/auditorias',Almacen,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT a.*,u.nombres||' '||u.apellidos usuario,
      COALESCE(json_agg(json_build_object('producto',p.nombre,'codigo',p.codigo,'stocksistema',d.stocksistema,'stockcontado',d.stockcontado,'diferencia',d.diferencia)) FILTER (WHERE d.id IS NOT NULL),'[]') detalles
    FROM auditoriasinventario a JOIN usuarios u ON u.id=a.usuarioid
    LEFT JOIN detalleauditoria d ON d.auditoriaid=a.id LEFT JOIN productos p ON p.id=d.productoid
    GROUP BY a.id,u.nombres,u.apellidos ORDER BY a.realizadoen DESC LIMIT 100
  `)
  res.json(datos.rows)
})

Api.post('/auditorias',Almacen,Validar(EsquemaAuditoria),async (req,res)=>{
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    const ids=req.body.productos.map(item=>item.productoid).sort((a,b)=>a-b)
    const productos=(await cliente.query('SELECT * FROM productos WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[ids])).rows
    if (productos.length!==ids.length) throw new Error('Producto inválido')
    const mapa=new Map(req.body.productos.map(item=>[item.productoid,item.stockcontado]))
    for (const producto of productos) {
      if (Number(mapa.get(producto.id))<Number(producto.stockreservado)) throw new Error(`El conteo de ${producto.nombre} es menor al stock reservado`)
    }
    const auditoria=(await cliente.query(
      `INSERT INTO auditoriasinventario(usuarioid,observacion) VALUES($1,$2) RETURNING *`,
      [req.usuario.id,req.body.observacion]
    )).rows[0]
    for (const producto of productos) {
      const contado=Number(mapa.get(producto.id))
      const sistema=Number(producto.stockactual)
      const diferencia=contado-sistema
      await cliente.query(
        `INSERT INTO detalleauditoria(auditoriaid,productoid,stocksistema,stockcontado,diferencia)
         VALUES($1,$2,$3,$4,$5)`,[auditoria.id,producto.id,sistema,contado,diferencia]
      )
      if (diferencia!==0) {
        const tipo=diferencia>0?'Ajuste':'Merma'
        await cliente.query('UPDATE productos SET stockactual=$1,actualizadoen=NOW() WHERE id=$2',[contado,producto.id])
        await cliente.query(
          `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid)
           VALUES($1,$2,$3,$4,$5)`,[producto.id,tipo,Math.abs(diferencia),`Auditoría ${auditoria.id}`,req.usuario.id]
        )
        if (diferencia>0) await CompletarReservasPendientes(cliente,producto.id,req.usuario.id)
      }
      await EvaluarProducto(cliente,producto.id,req.usuario.id,'Auditoria')
    }
    await RegistrarAuditoria(req.usuario.id,'RegistrarAuditoriaInventario','AuditoriaInventario',auditoria.id,{productos:productos.length},req.ip,cliente)
    await cliente.query('COMMIT')
    res.status(201).json(auditoria)
  } catch (error) {
    await cliente.query('ROLLBACK')
    res.status(409).json({mensaje:error.message})
  } finally { cliente.release() }
})

Api.get('/notificaciones',Operacion,async (req,res)=>{
  const datos=await BaseDatos.query(
    `SELECT * FROM notificaciones
     WHERE $1='Administrador' OR ($1='AsesorVentas' AND tipo='Cliente') OR ($1='JefeAlmacen' AND tipo='Proveedor')
     ORDER BY creadoen DESC LIMIT 300`,[req.usuario.rol]
  )
  res.json(datos.rows)
})

Api.get('/auditoriaacciones',Administrador,async (_,res)=>{
  const datos=await BaseDatos.query(`
    SELECT a.*,u.nombres||' '||u.apellidos usuario
    FROM auditoriaacciones a LEFT JOIN usuarios u ON u.id=a.usuarioid
    ORDER BY a.creadoen DESC LIMIT 500
  `)
  res.json(datos.rows)
})