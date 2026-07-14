import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Estado,FormatoFecha,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { UsarSesion } from '../../Contextos/Sesion'
import { Descargar,LeerArchivo,Solicitar } from '../../Servicios/Api'

export function Cotizaciones() {
  const { usuario }=UsarSesion()
  const [cotizaciones,setCotizaciones]=useState([])
  const [seleccion,setSeleccion]=useState(null)
  const [accion,setAccion]=useState('')
  const [texto,setTexto]=useState('')
  const [archivo,setArchivo]=useState(null)
  const [historial,setHistorial]=useState([])
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')
  const [enviando,setEnviando]=useState(false)

  const cargar=async()=>{
    try { setCotizaciones(await Solicitar('/cotizaciones')) } catch (fallo) { setError(fallo.message) }
  }
  useEffect(()=>{cargar()},[])

  const abrir=(cotizacion,nuevaAccion)=>{
    setSeleccion(cotizacion);setAccion(nuevaAccion);setTexto('');setArchivo(null);setError('')
  }

  const ejecutar=async evento=>{
    evento.preventDefault();setError('');setCorrecto('');setEnviando(true)
    try {
      let ruta='';let cuerpo={}
      if (accion==='contactar') { ruta='contactar';cuerpo={nota:texto} }
      if (accion==='comprobante') { ruta='comprobante';cuerpo={archivo:await LeerArchivo(archivo)} }
      if (accion==='aprobar') { ruta='verificarpago';cuerpo={aprobado:true,observacion:texto} }
      if (accion==='rechazarpago') { ruta='verificarpago';cuerpo={aprobado:false,observacion:texto} }
      if (accion==='rechazar') { ruta='rechazar';cuerpo={observacion:texto} }
      if (accion==='lista') { ruta='lista';cuerpo={observacion:texto} }
      if (accion==='entregar') { ruta='entregar';cuerpo={observacion:texto} }
      const respuesta=await Solicitar(`/cotizaciones/${seleccion.id}/${ruta}`,{method:'POST',body:JSON.stringify(cuerpo)})
      setSeleccion(respuesta);setAccion('');setCorrecto('Operación completada');await cargar()
    } catch (fallo) { setError(fallo.message) } finally { setEnviando(false) }
  }

  const verHistorial=async cotizacion=>{
    try { setSeleccion(cotizacion);setHistorial(await Solicitar(`/cotizaciones/${cotizacion.id}/historial`));setAccion('historial') } catch (fallo) { setError(fallo.message) }
  }

  const acciones=cotizacion=>{
    const lista=[]
    if (['Administrador','AsesorVentas'].includes(usuario.rol)&&cotizacion.estado==='Pendiente') lista.push(['contactar','Registrar contacto'])
    if (['Administrador','AsesorVentas'].includes(usuario.rol)&&['Contactada','PagoRechazado'].includes(cotizacion.estado)) lista.push(['comprobante','Adjuntar pago'])
    if (usuario.rol==='Administrador'&&cotizacion.estado==='ComprobanteAdjunto') { lista.push(['aprobar','Aprobar pago']);lista.push(['rechazarpago','Rechazar pago']) }
    if (['Administrador','JefeAlmacen'].includes(usuario.rol)&&cotizacion.estado==='EnPreparacion') lista.push(['lista','Marcar listo'])
    if (['Administrador','AsesorVentas','JefeAlmacen'].includes(usuario.rol)&&cotizacion.estado==='ListaRecojo') lista.push(['entregar','Registrar entrega'])
    if (['Administrador','AsesorVentas'].includes(usuario.rol)&&!['ListaRecojo','Entregada','Rechazada'].includes(cotizacion.estado)) lista.push(['rechazar','Rechazar cotización'])
    return lista
  }

  return <div className="pagina">
    <Titulo titulo="Cotizaciones" descripcion="Contacto, comprobante, verificación administrativa, almacén y entrega"/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tabla"><table>
      <thead><tr><th>N.°</th><th>Cliente</th><th>Contacto</th><th>Productos</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
      <tbody>{cotizaciones.map(c=><tr key={c.id}>
        <td>{c.id}</td><td><b>{c.cliente}</b><small className="linea">{c.dni||c.ruc}</small></td><td>{c.telefono}<small className="linea">{c.correo}</small></td>
        <td>{c.detalles.map(d=><div key={d.id} className="detallelinea"><b>{d.cantidad} ×</b> {d.producto}<small>{d.cantidadreservada} reservado</small></div>)}</td>
        <td>S/ {Number(c.total).toFixed(2)}</td><td><Estado valor={c.estado}/></td><td><FormatoFecha valor={c.creadoen}/></td>
        <td><div className="accionesfila vertical"><button className="secundario" onClick={()=>{setSeleccion(c);setAccion('detalle')}}>Ver detalle</button>{c.comprobanteen&&['Administrador','AsesorVentas'].includes(usuario.rol)&&<button className="secundario" onClick={()=>Descargar(`/cotizaciones/${c.id}/comprobante`,c.comprobantenombre||'comprobante')}>Comprobante</button>}{acciones(c).map(([id,nombre])=><button key={id} className={id.includes('rechazar')?'secundario peligrotexto':'secundario'} onClick={()=>abrir(c,id)}>{nombre}</button>)}<button className="secundario" onClick={()=>verHistorial(c)}>Historial</button></div></td>
      </tr>)}</tbody>
    </table></div>
    {seleccion&&accion==='detalle'&&<Modal titulo={`Cotización N.° ${seleccion.id}`} cerrar={()=>setAccion('')} ancho><Detalle cotizacion={seleccion}/></Modal>}
    {seleccion&&accion==='historial'&&<Modal titulo={`Historial N.° ${seleccion.id}`} cerrar={()=>setAccion('')} ancho><div className="lineatiempo">{historial.map(item=><div key={item.id}><Estado valor={item.estadonuevo}/><p>{item.observacion||'Sin observación'}</p><small>{item.usuario||'Sistema'} · <FormatoFecha valor={item.creadoen}/></small></div>)}</div></Modal>}
    {seleccion&&['contactar','aprobar','rechazarpago','rechazar','lista','entregar'].includes(accion)&&<Modal titulo={NombreAccion[accion]} cerrar={()=>setAccion('')}><form onSubmit={ejecutar}><Campo etiqueta="Observación" value={texto} onChange={e=>setTexto(e.target.value.slice(0,500))} minLength={accion==='lista'||accion==='entregar'?0:3} maxLength="500" required={!['lista','entregar'].includes(accion)}/><button className="principal" disabled={enviando}>{enviando?'Procesando...':'Confirmar'}</button></form></Modal>}
    {seleccion&&accion==='comprobante'&&<Modal titulo="Adjuntar comprobante del cliente" cerrar={()=>setAccion('')}><form onSubmit={ejecutar}><label className="campo"><span>Archivo PDF, PNG, JPG o WEBP</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e=>setArchivo(e.target.files[0])} required/><small>Máximo 1,3 MB</small></label><button className="principal" disabled={enviando}>{enviando?'Cargando...':'Registrar comprobante'}</button></form></Modal>}
  </div>
}

const NombreAccion={contactar:'Registrar contacto con el cliente',aprobar:'Aprobar pago',rechazarpago:'Rechazar pago',rechazar:'Rechazar cotización',lista:'Marcar pedido listo',entregar:'Registrar entrega'}

function Detalle({cotizacion}) {
  return <div><div className="fichas"><div><span>Cliente</span><b>{cotizacion.cliente}</b></div><div><span>Documento</span><b>{cotizacion.dni||cotizacion.ruc}</b></div><div><span>Correo</span><b>{cotizacion.correo}</b></div><div><span>Teléfono</span><b>{cotizacion.telefono}</b></div></div>{cotizacion.notacontacto&&<p><b>Contacto:</b> {cotizacion.notacontacto}</p>}{cotizacion.observacionpago&&<p><b>Pago:</b> {cotizacion.observacionpago}</p>}<div className="tabla"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Reservado</th><th>Precio</th><th>Base</th><th>Fijo</th><th>Volumen</th><th>Descuento total</th><th>Subtotal</th></tr></thead><tbody>{cotizacion.detalles.map(d=><tr key={d.id}><td>{d.codigo} · {d.producto}</td><td>{d.cantidad}</td><td>{d.cantidadreservada}</td><td>S/ {Number(d.precio).toFixed(2)}</td><td>S/ {Number(d.subtotalbase).toFixed(2)}</td><td>{Number(d.descuentofijo).toFixed(2)} %</td><td>{Number(d.descuentovolumen).toFixed(2)} %</td><td>{Number(d.descuento).toFixed(2)} %</td><td>S/ {Number(d.subtotal).toFixed(2)}</td></tr>)}</tbody></table></div></div>
}