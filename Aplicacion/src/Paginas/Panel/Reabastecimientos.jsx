import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Estado,FormatoFecha,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { UsarSesion } from '../../Contextos/Sesion'
import { Descargar,LeerArchivo,Solicitar } from '../../Servicios/Api'

export function Reabastecimientos() {
  const { usuario }=UsarSesion()
  const administrador=usuario.rol==='Administrador'
  const [registros,setRegistros]=useState([])
  const [productos,setProductos]=useState([])
  const [seleccion,setSeleccion]=useState(null)
  const [candidatos,setCandidatos]=useState([])
  const [modal,setModal]=useState('')
  const [manual,setManual]=useState({productoid:'',cantidadrequerida:'1',observacion:''})
  const [proveedorid,setProveedorid]=useState('')
  const [observacion,setObservacion]=useState('')
  const [archivo,setArchivo]=useState(null)
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const cargar=async()=>{
    try {
      const peticiones=[Solicitar('/reabastecimientos')]
      if (administrador) peticiones.push(Solicitar('/productos'))
      const [r,p=[]]=await Promise.all(peticiones)
      setRegistros(r);setProductos(p)
      if (!manual.productoid&&p[0]) setManual(actual=>({...actual,productoid:String(p[0].id)}))
    } catch (fallo) { setError(fallo.message) }
  }
  useEffect(()=>{cargar()},[])

  const abrirCandidatos=async registro=>{
    try {
      const datos=await Solicitar(`/reabastecimientos/${registro.id}/candidatos`)
      setSeleccion(registro);setCandidatos(datos);setProveedorid(String(datos[0]?.proveedorid||''));setObservacion('');setModal('candidatos')
    } catch (fallo) { setError(fallo.message) }
  }

  const seleccionar=async evento=>{
    evento.preventDefault();setError('')
    try {
      await Solicitar(`/reabastecimientos/${seleccion.id}/proveedor`,{method:'POST',body:JSON.stringify({proveedorid,observacion})})
      setModal('');setCorrecto('Proveedor seleccionado');await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const registrarPago=async evento=>{
    evento.preventDefault();setError('')
    try {
      const datos=await LeerArchivo(archivo)
      const respuesta=await Solicitar(`/reabastecimientos/${seleccion.id}/pago`,{method:'POST',body:JSON.stringify({archivo:datos,observacion})})
      setModal('');setCorrecto(`Pago registrado. Correo: ${respuesta.correoestado}`);await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const crearManual=async evento=>{
    evento.preventDefault();setError('')
    try {
      await Solicitar('/reabastecimientos',{method:'POST',body:JSON.stringify(manual)})
      setModal('');setCorrecto('Reabastecimiento creado');setManual(actual=>({...actual,cantidadrequerida:'1',observacion:''}));await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina">
    <Titulo titulo="Reabastecimiento" descripcion="Alertas automáticas, ranking 40/20/10/30, compra, pago y tránsito" accion={administrador?<button className="principal" onClick={()=>setModal('manual')}>Crear solicitud manual</button>:null}/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tabla"><table>
      <thead><tr><th>Orden</th><th>Producto</th><th>Motivo</th><th>Cantidad</th><th>Proveedor</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
      <tbody>{registros.map(r=><tr key={r.id}>
        <td>{r.ordencompra||`RA-${r.id}`}</td><td><b>{r.codigo}</b><small className="linea">{r.producto}</small></td><td>{r.motivo}{r.cotizacionid&&<small className="linea">Cotización {r.cotizacionid}</small>}</td><td>{r.cantidadrequerida}</td><td>{r.proveedor||'Pendiente'}</td><td><Estado valor={r.estado}/></td><td><FormatoFecha valor={r.creadoen}/></td>
        <td><div className="accionesfila vertical">{administrador&&r.estado==='Pendiente'&&<button className="secundario" onClick={()=>abrirCandidatos(r)}>Comparar candidatos</button>}{administrador&&r.estado==='ProveedorSeleccionado'&&<button className="secundario" onClick={()=>{setSeleccion(r);setObservacion('');setArchivo(null);setModal('pago')}}>Registrar pago</button>}{r.comprobantenombre&&<button className="secundario" onClick={()=>Descargar(`/reabastecimientos/${r.id}/comprobante`,r.comprobantenombre)}>Comprobante</button>}</div></td>
      </tr>)}</tbody>
    </table></div>
    {modal==='manual'&&<Modal titulo="Reabastecimiento manual" cerrar={()=>setModal('')}><form onSubmit={crearManual}>
      <label className="campo"><span>Producto</span><select value={manual.productoid} onChange={e=>setManual({...manual,productoid:e.target.value})}>{productos.filter(p=>p.activo).map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</select></label>
      <Campo etiqueta="Cantidad requerida" type="number" min="1" value={manual.cantidadrequerida} onChange={e=>setManual({...manual,cantidadrequerida:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Motivo" value={manual.observacion} onChange={e=>setManual({...manual,observacion:e.target.value.slice(0,500)})} minLength="3" required/>
      <button className="principal">Crear solicitud</button>
    </form></Modal>}
    {modal==='candidatos'&&<Modal titulo={`Candidatos para ${seleccion.producto}`} cerrar={()=>setModal('')} ancho><form onSubmit={seleccionar}>
      {candidatos.length?<><div className="tabla"><table><thead><tr><th>Proveedor</th><th>Precio 40 %</th><th>Entrega 20 %</th><th>Pedidos 10 %</th><th>Puntaje 30 %</th><th>Resultado</th></tr></thead><tbody>{candidatos.map(c=><tr key={c.proveedorid} className={c.esmejor?'mejor':''}><td><label className="opcionradio"><input type="radio" name="proveedor" value={c.proveedorid} checked={String(c.proveedorid)===proveedorid} onChange={e=>setProveedorid(e.target.value)}/><span><b>{c.razonsocial}</b>{c.esmejor&&<small>Mejor candidato o empate</small>}</span></label></td><td>S/ {Number(c.precioevaluado).toFixed(2)}<small className="linea">Base S/ {Number(c.preciohabitual).toFixed(2)}</small></td><td>{c.diasentrega} días</td><td>{c.pedidosanteriores}</td><td>{Number(c.puntaje).toFixed(1)}/5</td><td><b>{Number(c.puntajeseleccion).toFixed(2)}</b></td></tr>)}</tbody></table></div><Campo etiqueta="Justificación de selección" value={observacion} onChange={e=>setObservacion(e.target.value.slice(0,500))} maxLength="500"/><button className="principal">Seleccionar proveedor</button></>:<p>No existen proveedores asociados a este producto.</p>}
    </form></Modal>}
    {modal==='pago'&&<Modal titulo={`Pago de ${seleccion.ordencompra}`} cerrar={()=>setModal('')}><form onSubmit={registrarPago}>
      <label className="campo"><span>Voucher de pago</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e=>setArchivo(e.target.files[0])} required/><small>Máximo 1,3 MB</small></label>
      <Campo etiqueta="Observación" value={observacion} onChange={e=>setObservacion(e.target.value.slice(0,500))} maxLength="500"/>
      <button className="principal">Registrar y enviar al proveedor</button>
    </form></Modal>}
  </div>
}