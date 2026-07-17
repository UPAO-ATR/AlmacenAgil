import { BaseDatos } from '../BaseDatos.js'

export async function RegistrarHistorialCotizacion(cliente,cotizacionid,estadoanterior,estadonuevo,observacion,usuarioid) {
  await cliente.query(
    `INSERT INTO historialcotizaciones(cotizacionid,estadoanterior,estadonuevo,observacion,usuarioid)
     VALUES($1,$2,$3,$4,$5)`,
    [cotizacionid,estadoanterior||null,estadonuevo,observacion||'',usuarioid||null]
  )
}

export async function RegistrarHistorialReabastecimiento(cliente,reabastecimientoid,estadoanterior,estadonuevo,observacion,usuarioid) {
  await cliente.query(
    `INSERT INTO historialreabastecimientos(reabastecimientoid,estadoanterior,estadonuevo,observacion,usuarioid)
     VALUES($1,$2,$3,$4,$5)`,
    [reabastecimientoid,estadoanterior||null,estadonuevo,observacion||'',usuarioid||null]
  )
}

export async function CrearReabastecimiento(cliente,datos) {
  const cantidad=Math.min(1000,Math.max(1,Number(datos.cantidadrequerida)||1))
  const activo = (await cliente.query(
    `SELECT * FROM reabastecimientos
     WHERE productoid=$1
       AND (
         ($2='Cotizacion' AND motivo='Cotizacion' AND COALESCE(cotizacionid,0)=COALESCE($3,0))
         OR ($2<>'Cotizacion' AND motivo<>'Cotizacion' AND cotizacionid IS NULL)
       )
       AND estado IN ('Pendiente','ProveedorSeleccionado','PagoRegistrado','EnTransito')
     ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [datos.productoid,datos.motivo,datos.cotizacionid||null]
  )).rows[0]
  if (activo) {
    const observacion=[activo.observacion,datos.observacion].filter(Boolean).filter((valor,indice,lista)=>lista.indexOf(valor)===indice).join(' | ').slice(0,500)
    const actualizado = (await cliente.query(
      `UPDATE reabastecimientos
       SET cantidadrequerida=LEAST(1000,GREATEST(cantidadrequerida,$1)),observacion=$2,actualizadoen=NOW()
       WHERE id=$3 RETURNING *`,
      [cantidad,observacion,activo.id]
    )).rows[0]
    return actualizado
  }
  const nuevo = (await cliente.query(
    `INSERT INTO reabastecimientos(productoid,cotizacionid,motivo,cantidadrequerida,observacion)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [datos.productoid,datos.cotizacionid||null,datos.motivo,cantidad,datos.observacion||'']
  )).rows[0]
  await RegistrarHistorialReabastecimiento(cliente,nuevo.id,null,'Pendiente',datos.observacion||'',datos.usuarioid)
  return nuevo
}

export async function EvaluarProducto(cliente,productoid,usuarioid,motivo='StockMinimo') {
  const producto = (await cliente.query(
    `SELECT id,nombre,stockactual,stockreservado,stockminimo,stockmensual
     FROM productos WHERE id=$1 AND activo=true FOR UPDATE`,
    [productoid]
  )).rows[0]
  if (!producto) return null
  const disponible = Number(producto.stockactual)-Number(producto.stockreservado)
  if (disponible>=Number(producto.stockminimo)) return null
  const objetivo = Math.max(Number(producto.stockmensual),Number(producto.stockminimo))
  return CrearReabastecimiento(cliente,{
    productoid:producto.id,
    motivo,
    cantidadrequerida:Math.max(1,objetivo-disponible),
    observacion:`Stock disponible ${disponible}; objetivo ${objetivo}`,
    usuarioid
  })
}

export async function EvaluarInicioMensual(cliente=BaseDatos,usuarioid=null) {
  const periodo = new Date().toISOString().slice(0,7)
  const productos = (await cliente.query(
    `SELECT id,stockactual,stockreservado,stockmensual
     FROM productos WHERE activo=true ORDER BY id FOR UPDATE`
  )).rows
  const creados=[]
  for (const producto of productos) {
    const revision = (await cliente.query(
      `INSERT INTO revisionesmensuales(productoid,periodo,stockrevisado)
       VALUES($1,$2,$3)
       ON CONFLICT (productoid,periodo) DO NOTHING
       RETURNING id`,
      [producto.id,periodo,producto.stockactual]
    )).rows[0]
    const disponible=Number(producto.stockactual)-Number(producto.stockreservado)
    if (revision&&disponible<Number(producto.stockmensual)) {
      creados.push(await CrearReabastecimiento(cliente,{
        productoid:producto.id,
        motivo:'StockMensual',
        cantidadrequerida:Number(producto.stockmensual)-disponible,
        observacion:`Revisión mensual ${periodo}`,
        usuarioid
      }))
    }
  }
  return creados
}

export async function ReservarCotizacion(cliente,cotizacionid,usuarioid,observacion) {
  const cotizacion = (await cliente.query(
    'SELECT * FROM cotizaciones WHERE id=$1 FOR UPDATE',
    [cotizacionid]
  )).rows[0]
  if (!cotizacion) throw new Error('Cotización no encontrada')
  if (cotizacion.estado!=='ComprobanteAdjunto') throw new Error('Estado de cotización inválido')
  await cliente.query(
    `UPDATE cotizaciones SET estado='PagoVerificado',verificadorid=$1,verificadoen=NOW(),observacionpago=$2,actualizadoen=NOW() WHERE id=$3`,
    [usuarioid,observacion,cotizacionid]
  )
  await RegistrarHistorialCotizacion(cliente,cotizacionid,cotizacion.estado,'PagoVerificado',observacion,usuarioid)
  const detalles = (await cliente.query(
    `SELECT d.*,p.nombre,p.stockactual,p.stockreservado
     FROM detallecotizacion d
     JOIN productos p ON p.id=d.productoid
     WHERE d.cotizacionid=$1
     ORDER BY d.productoid FOR UPDATE OF d,p`,
    [cotizacionid]
  )).rows
  let completo=true
  for (const detalle of detalles) {
    const faltante=Number(detalle.cantidad)-Number(detalle.cantidadreservada)
    const disponible=Number(detalle.stockactual)-Number(detalle.stockreservado)
    const reservar=Math.max(0,Math.min(faltante,disponible))
    if (reservar>0) {
      await cliente.query('UPDATE productos SET stockreservado=stockreservado+$1,actualizadoen=NOW() WHERE id=$2',[reservar,detalle.productoid])
      await cliente.query('UPDATE detallecotizacion SET cantidadreservada=cantidadreservada+$1 WHERE id=$2',[reservar,detalle.id])
      await cliente.query(
        `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid,cotizacionid)
         VALUES($1,'Reserva',$2,$3,$4,$5)`,
        [detalle.productoid,reservar,`Reserva de cotización ${cotizacionid}`,usuarioid,cotizacionid]
      )
    }
    const pendiente=faltante-reservar
    if (pendiente>0) {
      completo=false
      await CrearReabastecimiento(cliente,{
        productoid:detalle.productoid,
        cotizacionid,
        motivo:'Cotizacion',
        cantidadrequerida:pendiente,
        observacion:`Faltante para cotización ${cotizacionid}`,
        usuarioid
      })
    }
  }
  const nuevoestado=completo?'EnPreparacion':'PendienteReabastecimiento'
  await cliente.query(
    `UPDATE cotizaciones SET estado=$1,actualizadoen=NOW() WHERE id=$2`,
    [nuevoestado,cotizacionid]
  )
  await RegistrarHistorialCotizacion(cliente,cotizacionid,'PagoVerificado',nuevoestado,completo?'Stock reservado':'Reabastecimiento requerido',usuarioid)
  return {nuevoestado,completo}
}

export async function LiberarReservasCotizacion(cliente,cotizacionid,usuarioid,motivo) {
  const detalles=(await cliente.query(
    `SELECT d.id,d.productoid,d.cantidadreservada
     FROM detallecotizacion d WHERE d.cotizacionid=$1 ORDER BY d.productoid FOR UPDATE`,
    [cotizacionid]
  )).rows
  for (const detalle of detalles) {
    const cantidad=Number(detalle.cantidadreservada)
    if (!cantidad) continue
    await cliente.query('UPDATE productos SET stockreservado=stockreservado-$1,actualizadoen=NOW() WHERE id=$2',[cantidad,detalle.productoid])
    await cliente.query('UPDATE detallecotizacion SET cantidadreservada=0 WHERE id=$1',[detalle.id])
    await cliente.query(
      `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid,cotizacionid)
       VALUES($1,'Liberacion',$2,$3,$4,$5)`,
      [detalle.productoid,cantidad,motivo,usuarioid,cotizacionid]
    )
  }
}

export async function CompletarReservasPendientes(cliente,productoid,usuarioid) {
  const producto=(await cliente.query(
    'SELECT * FROM productos WHERE id=$1 FOR UPDATE',
    [productoid]
  )).rows[0]
  let disponible=Number(producto.stockactual)-Number(producto.stockreservado)
  if (disponible<=0) return []
  const pendientes=(await cliente.query(
    `SELECT d.id,d.cotizacionid,d.cantidad,d.cantidadreservada
     FROM detallecotizacion d
     JOIN cotizaciones c ON c.id=d.cotizacionid
     WHERE d.productoid=$1 AND d.cantidadreservada<d.cantidad AND c.estado='PendienteReabastecimiento'
     ORDER BY c.creadoen,d.id FOR UPDATE OF d`,
    [productoid]
  )).rows
  const cotizaciones=new Set()
  for (const detalle of pendientes) {
    if (disponible<=0) break
    const faltante=Number(detalle.cantidad)-Number(detalle.cantidadreservada)
    const reservar=Math.min(faltante,disponible)
    await cliente.query('UPDATE detallecotizacion SET cantidadreservada=cantidadreservada+$1 WHERE id=$2',[reservar,detalle.id])
    await cliente.query('UPDATE productos SET stockreservado=stockreservado+$1,actualizadoen=NOW() WHERE id=$2',[reservar,productoid])
    await cliente.query(
      `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid,cotizacionid)
       VALUES($1,'Reserva',$2,$3,$4,$5)`,
      [productoid,reservar,`Reserva completada para cotización ${detalle.cotizacionid}`,usuarioid,detalle.cotizacionid]
    )
    disponible-=reservar
    cotizaciones.add(detalle.cotizacionid)
  }
  const listas=[]
  for (const id of cotizaciones) {
    const falta=(await cliente.query(
      'SELECT COUNT(*)::int cantidad FROM detallecotizacion WHERE cotizacionid=$1 AND cantidadreservada<cantidad',
      [id]
    )).rows[0].cantidad
    if (falta===0) {
      await cliente.query("UPDATE cotizaciones SET estado='EnPreparacion',actualizadoen=NOW() WHERE id=$1",[id])
      await RegistrarHistorialCotizacion(cliente,id,'PendienteReabastecimiento','EnPreparacion','Stock completado',usuarioid)
      const cancelados=(await cliente.query(
        `UPDATE reabastecimientos SET estado='Cancelado',actualizadoen=NOW()
         WHERE cotizacionid=$1 AND estado='Pendiente' RETURNING id`,[id]
      )).rows
      for (const cancelado of cancelados) {
        await RegistrarHistorialReabastecimiento(cliente,cancelado.id,'Pendiente','Cancelado','Stock cubierto por otra recepción',usuarioid)
      }
      listas.push(id)
    }
  }
  return listas
}

export async function DespacharCotizacion(cliente,cotizacionid,usuarioid,observacion) {
  const cotizacion=(await cliente.query('SELECT * FROM cotizaciones WHERE id=$1 FOR UPDATE',[cotizacionid])).rows[0]
  if (!cotizacion) throw new Error('Cotización no encontrada')
  if (cotizacion.estado!=='EnPreparacion') throw new Error('La cotización no está en preparación')
  const detalles=(await cliente.query(
    `SELECT d.*,p.stockactual,p.stockreservado,p.nombre
     FROM detallecotizacion d JOIN productos p ON p.id=d.productoid
     WHERE d.cotizacionid=$1 ORDER BY d.productoid FOR UPDATE OF d,p`,
    [cotizacionid]
  )).rows
  for (const detalle of detalles) {
    if (Number(detalle.cantidadreservada)!==Number(detalle.cantidad)) throw new Error('Reserva incompleta')
    if (Number(detalle.stockactual)<Number(detalle.cantidad)||Number(detalle.stockreservado)<Number(detalle.cantidad)) throw new Error('Stock inconsistente')
    await cliente.query(
      `UPDATE productos
       SET stockactual=stockactual-$1,stockreservado=stockreservado-$1,actualizadoen=NOW()
       WHERE id=$2`,
      [detalle.cantidad,detalle.productoid]
    )
    await cliente.query(
      `INSERT INTO movimientos(productoid,tipo,cantidad,motivo,usuarioid,cotizacionid)
       VALUES($1,'Salida',$2,$3,$4,$5)`,
      [detalle.productoid,detalle.cantidad,`Pedido listo de cotización ${cotizacionid}`,usuarioid,cotizacionid]
    )
  }
  await cliente.query("UPDATE cotizaciones SET estado='ListaRecojo',actualizadoen=NOW() WHERE id=$1",[cotizacionid])
  await RegistrarHistorialCotizacion(cliente,cotizacionid,cotizacion.estado,'ListaRecojo',observacion,usuarioid)
  for (const detalle of detalles) await EvaluarProducto(cliente,detalle.productoid,usuarioid)
  return cotizacion
}