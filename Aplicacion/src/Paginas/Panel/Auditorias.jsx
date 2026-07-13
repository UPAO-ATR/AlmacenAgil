import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { FormatoFecha,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'

export function Auditorias() {
  const [auditorias,setAuditorias]=useState([])
  const [productos,setProductos]=useState([])
  const [conteos,setConteos]=useState({})
  const [observacion,setObservacion]=useState('')
  const [modal,setModal]=useState(false)
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const cargar=async()=>{
    try {
      const [a,p]=await Promise.all([Solicitar('/auditorias'),Solicitar('/productos')])
      setAuditorias(a);setProductos(p.filter(item=>item.activo))
      setConteos(Object.fromEntries(p.filter(item=>item.activo).map(item=>[item.id,String(item.stockactual)])))
    } catch (fallo) { setError(fallo.message) }
  }
  useEffect(()=>{cargar()},[])

  const guardar=async evento=>{
    evento.preventDefault();setError('')
    try {
      const cuerpo={observacion,productos:productos.map(producto=>({productoid:producto.id,stockcontado:conteos[producto.id]}))}
      await Solicitar('/auditorias',{method:'POST',body:JSON.stringify(cuerpo)})
      setModal(false);setCorrecto('Auditoría registrada y existencias ajustadas');await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina">
    <Titulo titulo="Auditorías de inventario" descripcion="Conteo físico quincenal, mermas, ajustes y nuevas alertas" accion={<button className="principal" onClick={()=>setModal(true)}>Nueva auditoría</button>}/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tarjetas">{auditorias.map(a=><article className="panel" key={a.id}><div className="cabeceratarjeta"><div><h3>Auditoría N.° {a.id}</h3><small>{a.usuario} · <FormatoFecha valor={a.realizadoen}/></small></div><span className="estado advertencia">Próxima: {new Date(a.proximafecha).toLocaleDateString('es-PE')}</span></div><p>{a.observacion}</p><div className="listacompacta">{a.detalles.map((d,i)=><div key={i}><span><b>{d.codigo}</b> {d.producto}</span><span>{d.stocksistema} → {d.stockcontado} ({Number(d.diferencia)>0?'+':''}{d.diferencia})</span></div>)}</div></article>)}</div>
    {modal&&<Modal titulo="Auditoría física" cerrar={()=>setModal(false)} ancho><form onSubmit={guardar}>
      <Campo etiqueta="Observación general" value={observacion} onChange={e=>setObservacion(e.target.value.slice(0,500))} minLength="3" maxLength="500" required/>
      <div className="tabla"><table><thead><tr><th>Producto</th><th>Stock sistema</th><th>Stock reservado</th><th>Conteo físico</th></tr></thead><tbody>{productos.map(p=><tr key={p.id}><td>{p.codigo} · {p.nombre}</td><td>{p.stockactual}</td><td>{p.stockreservado}</td><td><input className="entradatabla" type="number" min={p.stockreservado} max="1000000" value={conteos[p.id]??''} onChange={e=>setConteos({...conteos,[p.id]:e.target.value.replace(/\D/g,'')})} required/></td></tr>)}</tbody></table></div>
      <button className="principal">Registrar auditoría</button>
    </form></Modal>}
  </div>
}