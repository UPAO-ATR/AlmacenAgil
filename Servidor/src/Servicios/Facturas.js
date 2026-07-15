import crypto from 'crypto'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { BaseDatos } from '../BaseDatos.js'

function CodigoAleatorio() {
  return `FIV${new Date().getFullYear()}${crypto.randomBytes(10).toString('hex').toUpperCase()}`
}

function Huella(contenido,codigo) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(contenido))
    .update(codigo)
    .digest('hex')
}

function NumeroFactura(factura) {
  return `${factura.serie}-${String(factura.numero).padStart(8,'0')}`
}

export async function CrearFactura(cliente,cotizacionid,usuarioid) {
  const existente=(await cliente.query('SELECT * FROM facturas WHERE cotizacionid=$1',[cotizacionid])).rows[0]
  if (existente) return existente

  const cotizacion=(await cliente.query(
    `SELECT c.*,COALESCE(entrega.creadoen,c.actualizadoen) entregadaen,
      COALESCE(ue.nombres||' '||ue.apellidos,'Sistema') entregadopor,
      COALESCE(uv.nombres||' '||uv.apellidos,'No registrado') verificadopor,
      COALESCE(ui.nombres||' '||ui.apellidos,'Sistema') emitidapor
     FROM cotizaciones c
     LEFT JOIN LATERAL (
       SELECT h.creadoen,h.usuarioid FROM historialcotizaciones h
       WHERE h.cotizacionid=c.id AND h.estadonuevo='Entregada'
       ORDER BY h.creadoen DESC LIMIT 1
     ) entrega ON true
     LEFT JOIN usuarios ue ON ue.id=entrega.usuarioid
     LEFT JOIN usuarios uv ON uv.id=c.verificadorid
     LEFT JOIN usuarios ui ON ui.id=$2
     WHERE c.id=$1`,[cotizacionid,usuarioid])).rows[0]
  if (!cotizacion) throw new Error('Cotización no encontrada')
  if (cotizacion.estado!=='Entregada') throw new Error('La factura solo se genera después de la entrega')

  const empresa=(await cliente.query('SELECT * FROM configuracionempresa WHERE id=1')).rows[0]
  if (!empresa) throw new Error('Configure los datos de emisión')

  const detalles=(await cliente.query(
    `SELECT p.codigo,p.nombre,p.tipoproducto,p.material,p.grosor,p.dimensiones,
      d.cantidad,d.precio,d.descuentofijo,d.descuentovolumen,d.descuento,
      ROUND(d.cantidad*d.precio,2) subtotalbase,
      ROUND(d.cantidad*d.precio*(1-d.descuento/100),2) subtotal
     FROM detallecotizacion d JOIN productos p ON p.id=d.productoid
     WHERE d.cotizacionid=$1 ORDER BY d.id`,[cotizacionid])).rows
  if (!detalles.length) throw new Error('La cotización no tiene productos')

  const emitidaen=new Date().toISOString()
  const contenido={
    empresa:{
      nombrecomercial:empresa.nombrecomercial,
      razonsocial:empresa.razonsocial,
      ruc:empresa.ruc,
      direccion:empresa.direccion,
      telefono:empresa.telefono,
      correo:empresa.correo
    },
    cliente:{
      nombre:cotizacion.cliente,
      documento:cotizacion.dni||cotizacion.ruc,
      tipodocumento:cotizacion.dni?'DNI':'RUC',
      telefono:cotizacion.telefono,
      correo:cotizacion.correo
    },
    cotizacionid:cotizacion.id,
    creadoen:cotizacion.creadoen,
    pagoverificadoen:cotizacion.verificadoen,
    verificadopor:cotizacion.verificadopor,
    entregadaen:cotizacion.entregadaen,
    entregadapor:cotizacion.entregadopor,
    emitidaen,
    emitidapor:cotizacion.emitidapor,
    observacionpago:cotizacion.observacionpago||'',
    productos:detalles.map(item=>({
      codigo:item.codigo,
      nombre:item.nombre,
      clasificacion:[item.tipoproducto,item.material,item.grosor,item.dimensiones].filter(Boolean).join(' · '),
      cantidad:Number(item.cantidad),
      preciounitario:Number(item.precio),
      descuentofijo:Number(item.descuentofijo),
      descuentovolumen:Number(item.descuentovolumen),
      descuentototal:Number(item.descuento),
      subtotalbase:Number(item.subtotalbase),
      subtotal:Number(item.subtotal)
    })),
    total:Number(cotizacion.total),
    moneda:'PEN'
  }

  for (let intento=0;intento<5;intento+=1) {
    const codigo=CodigoAleatorio()
    const huella=Huella(contenido,codigo)
    try {
      return (await cliente.query(
        `INSERT INTO facturas(cotizacionid,serie,codigo,contenido,huella,usuarioid,emitidaen)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [cotizacionid,empresa.serie,codigo,contenido,huella,usuarioid,emitidaen]
      )).rows[0]
    } catch (error) {
      if (error.code==='23505') {
        const creada=(await cliente.query('SELECT * FROM facturas WHERE cotizacionid=$1',[cotizacionid])).rows[0]
        if (creada) return creada
        continue
      }
      throw error
    }
  }
  throw new Error('No se pudo generar el código de la factura')
}

export async function ObtenerFactura(codigo,cliente=BaseDatos) {
  return (await cliente.query('SELECT * FROM facturas WHERE codigo=$1',[codigo])).rows[0]
}

export function FacturaPublica(factura) {
  const contenido=factura.contenido
  const documento=String(contenido.cliente.documento||'')
  const ocultos=Math.max(0,documento.length-4)
  return {
    valida:Huella(contenido,factura.codigo)===factura.huella,
    numero:NumeroFactura(factura),
    codigo:factura.codigo,
    huella:factura.huella,
    emitidaen:factura.emitidaen,
    empresa:contenido.empresa,
    cliente:{
      nombre:contenido.cliente.nombre,
      tipodocumento:contenido.cliente.tipodocumento,
      documento:`${'*'.repeat(ocultos)}${documento.slice(-4)}`
    },
    cotizacionid:contenido.cotizacionid,
    entregadaen:contenido.entregadaen,
    productos:contenido.productos.map(item=>({codigo:item.codigo,nombre:item.nombre,cantidad:item.cantidad,subtotal:item.subtotal})),
    total:contenido.total,
    moneda:contenido.moneda,
    aviso:'Documento interno no tributario'
  }
}

function Moneda(valor) {
  return `S/ ${Number(valor).toFixed(2)}`
}

function Fecha(valor) {
  return valor?new Date(valor).toLocaleString('es-PE',{timeZone:'America/Lima'}):'No registrada'
}

export async function GenerarPdfFactura(factura,urlVerificacion) {
  const qr=await QRCode.toBuffer(urlVerificacion,{errorCorrectionLevel:'M',margin:1,width:180})
  const contenido=factura.contenido
  return new Promise((resolver,rechazar)=>{
    const doc=new PDFDocument({size:'A4',margin:38,info:{Title:`Factura interna ${NumeroFactura(factura)}`,Author:'Almacén Ágil'}})
    const partes=[]
    doc.on('data',parte=>partes.push(parte))
    doc.on('end',()=>resolver(Buffer.concat(partes)))
    doc.on('error',rechazar)

    const ancho=doc.page.width-76
    const nuevaPagina=()=>{
      doc.addPage()
      doc.fontSize(9).fillColor('#5b697b').text(`Factura interna ${NumeroFactura(factura)}`,38,24,{align:'right'})
    }
    const asegurar=alto=>{if (doc.y+alto>doc.page.height-55) nuevaPagina()}

    doc.fillColor('#173f70').font('Helvetica-Bold').fontSize(21).text('FACTURA INTERNA DE VENTA',38,38)
    doc.fillColor('#b42318').fontSize(10).text('DOCUMENTO INTERNO NO TRIBUTARIO · NO REEMPLAZA BOLETA O FACTURA SUNAT')
    doc.moveDown(.7)
    doc.fillColor('#172033').fontSize(12).text(contenido.empresa.nombrecomercial)
    doc.font('Helvetica').fontSize(9)
    doc.text(`Razón social: ${contenido.empresa.razonsocial}`)
    doc.text(`RUC: ${contenido.empresa.ruc}`)
    doc.text(`Dirección: ${contenido.empresa.direccion}`)
    doc.text(`Teléfono: ${contenido.empresa.telefono} · Correo: ${contenido.empresa.correo}`)

    const yCabecera=45
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#172033')
    doc.text(NumeroFactura(factura),360,yCabecera,{width:195,align:'right'})
    doc.font('Helvetica').fontSize(9)
    doc.text(`Emisión: ${Fecha(factura.emitidaen)}`,360,yCabecera+18,{width:195,align:'right'})
    doc.text(`Cotización: N.° ${contenido.cotizacionid}`,360,yCabecera+32,{width:195,align:'right'})

    doc.moveDown(1)
    doc.strokeColor('#dfe6ee').moveTo(38,doc.y).lineTo(557,doc.y).stroke()
    doc.moveDown(.7)
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#173f70').text('Cliente')
    doc.font('Helvetica').fontSize(9).fillColor('#172033')
    doc.text(`${contenido.cliente.nombre} · ${contenido.cliente.tipodocumento}: ${contenido.cliente.documento}`)
    doc.text(`Teléfono: ${contenido.cliente.telefono} · Correo: ${contenido.cliente.correo}`)
    doc.moveDown(.8)

    const x=[38,85,315,365,430,500]
    const encabezados=['Cant.','Producto','P. unit.','Desc.','Base','Total']
    doc.rect(38,doc.y,ancho,22).fill('#eef5fc')
    let y=doc.y+7
    doc.fillColor('#173f70').font('Helvetica-Bold').fontSize(8)
    encabezados.forEach((texto,indice)=>doc.text(texto,x[indice],y,{width:indice===1?225:60,align:indice===1?'left':'right'}))
    doc.y+=28

    for (const item of contenido.productos) {
      asegurar(48)
      y=doc.y
      const descripcion=`${item.codigo} · ${item.nombre}`
      const alto=Math.max(34,doc.heightOfString(descripcion,{width:220})+18)
      doc.fillColor('#172033').font('Helvetica').fontSize(8)
      doc.text(String(item.cantidad),x[0],y,{width:40,align:'right'})
      doc.text(descripcion,x[1],y,{width:220})
      doc.fillColor('#60728a').fontSize(7).text(item.clasificacion,x[1],y+14,{width:220})
      doc.fillColor('#172033').fontSize(8)
      doc.text(Moneda(item.preciounitario),x[2],y,{width:55,align:'right'})
      doc.text(`${item.descuentototal.toFixed(2)} %`,x[3],y,{width:58,align:'right'})
      doc.text(Moneda(item.subtotalbase),x[4],y,{width:62,align:'right'})
      doc.text(Moneda(item.subtotal),x[5],y,{width:55,align:'right'})
      doc.strokeColor('#edf1f5').moveTo(38,y+alto).lineTo(557,y+alto).stroke()
      doc.y=y+alto+6
    }

    asegurar(90)
    doc.moveDown(.3)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#173f70').text(`TOTAL: ${Moneda(contenido.total)}`,380,doc.y,{width:177,align:'right'})
    doc.moveDown(1.5)
    doc.fontSize(10).text('Trazabilidad de la operación',38,doc.y)
    doc.font('Helvetica').fontSize(8).fillColor('#172033')
    doc.text(`Pago verificado: ${Fecha(contenido.pagoverificadoen)} · ${contenido.verificadopor}`)
    doc.text(`Pedido entregado: ${Fecha(contenido.entregadaen)} · ${contenido.entregadapor}`)
    doc.text(`Factura emitida por: ${contenido.emitidapor}`)
    if (contenido.observacionpago) doc.text(`Observación de pago: ${contenido.observacionpago}`)

    asegurar(165)
    const yVerificacion=doc.y+14
    doc.image(qr,38,yVerificacion,{width:105,height:105})
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#173f70').text('Verificación',160,yVerificacion,{width:397})
    doc.font('Helvetica').fontSize(8).fillColor('#172033')
    doc.text(`Código: ${factura.codigo}`,160,yVerificacion+20,{width:397})
    doc.text(`Huella SHA-256: ${factura.huella}`,160,yVerificacion+37,{width:397})
    doc.fillColor('#2366b1').text(urlVerificacion,160,yVerificacion+67,{width:397,link:urlVerificacion,underline:true})
    doc.fillColor('#5b697b').text('Escanee el código QR o consulte la dirección para comprobar que los datos coinciden con el registro del sistema.',160,yVerificacion+88,{width:390})

    doc.fontSize(7).fillColor('#7a8796').text('Este documento acredita internamente la venta y entrega registrada en Almacén Ágil. No tiene validez tributaria ante SUNAT.',38,doc.page.height-38,{width:ancho,align:'center'})
    doc.end()
  })
}
