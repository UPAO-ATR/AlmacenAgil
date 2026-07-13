import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { FormatoFecha,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'

export function Recepciones() {
  const [recepciones,setRecepciones]=useState([])
  const [compras,setCompras]=useState([])
  const [modal,setModal]=useState(false)
  const [formulario,setFormulario]=useState({reabastecimientoid:'',recibida:'0',faltantes:'0',defectuosos:'0',observacion:''})
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const cargar=async()=>{
    try {
      const [r,c]=await Promise.all([Solicitar('/recepciones'),Solicitar('/reabastecimientos')])
      setRecepciones(r);setCompras(c.filter(item=>item.estado==='EnTransito'))
      const primera=c.find(item=>item.estado==='EnTransito')
      if (primera&&!formulario.reabastecimientoid) setFormulario(actual=>({...actual,reabastecimientoid:String(primera.id),recibida:String(primera.cantidadrequerida)}))
    } catch (fallo) { setError(fallo.message) }
  }
  useEffect(()=>{cargar()},[])

  const seleccionar=id=>{
    const compra=compras.find(item=>String(item.id)===String(id))
    setFormulario({...formulario,reabastecimientoid:String(id),recibida:String(compra?.cantidadrequerida||0),faltantes:'0',defectuosos:'0'})
  }

  const guardar=async evento=>{
    evento.preventDefault();setError('')
    try {
      await Solicitar('/recepciones',{method:'POST',body:JSON.stringify(formulario)})
      setModal(false);setCorrecto('Recepción registrada y stock actualizado');await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina">
    <Titulo titulo="Recepciones" descripcion="Control de unidades recibidas, faltantes, defectuosas y actualización de stock" accion={<button className="principal" disabled={!compras.length} onClick={()=>setModal(true)}>Registrar recepción</button>}/>
    <Mensaje error={error} correcto={correcto}/>
    {!compras.length&&<div className="panel"><p>No hay compras en tránsito pendientes de recepción.</p></div>}
    <div className="tabla"><table>
      <thead><tr><th>Orden</th><th>Producto</th><th>Proveedor</th><th>Solicitado</th><th>Recibido</th><th>Faltantes</th><th>Defectuosos</th><th>Responsable</th><th>Fecha</th></tr></thead>
      <tbody>{recepciones.map(r=><tr key={r.id}><td>{r.ordencompra}</td><td>{r.producto}</td><td>{r.proveedor}</td><td>{r.solicitada}</td><td>{r.recibida}</td><td>{r.faltantes}</td><td>{r.defectuosos}</td><td>{r.usuario}</td><td><FormatoFecha valor={r.creadoen}/></td></tr>)}</tbody>
    </table></div>
    {modal&&<Modal titulo="Registrar recepción" cerrar={()=>setModal(false)}><form onSubmit={guardar}>
      <label className="campo"><span>Compra en tránsito</span><select value={formulario.reabastecimientoid} onChange={e=>seleccionar(e.target.value)}>{compras.map(c=><option key={c.id} value={c.id}>{c.ordencompra} · {c.producto} · {c.cantidadrequerida} unidades</option>)}</select></label>
      <Campo etiqueta="Unidades en buen estado" type="number" min="0" value={formulario.recibida} onChange={e=>setFormulario({...formulario,recibida:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Unidades faltantes" type="number" min="0" value={formulario.faltantes} onChange={e=>setFormulario({...formulario,faltantes:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Unidades defectuosas" type="number" min="0" value={formulario.defectuosos} onChange={e=>setFormulario({...formulario,defectuosos:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Observación" value={formulario.observacion} onChange={e=>setFormulario({...formulario,observacion:e.target.value.slice(0,500)})} minLength="3" required/>
      <button className="principal">Registrar recepción</button>
    </form></Modal>}
  </div>
}