import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Estado,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'

const Vacio={razonsocial:'',ruc:'',contacto:'',telefono:'',correo:'',ubicacion:''}
const VinculoVacio={productoid:'',preciohabitual:'',descuentolanzamiento:'0',diasentrega:'1',pedidosanteriores:'0',puntaje:'5'}

export function Proveedores() {
  const [proveedores,setProveedores]=useState([])
  const [productos,setProductos]=useState([])
  const [seleccion,setSeleccion]=useState(null)
  const [formulario,setFormulario]=useState(Vacio)
  const [vinculo,setVinculo]=useState(VinculoVacio)
  const [modal,setModal]=useState('')
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const cargar=async()=>{
    try {
      const [p,pr]=await Promise.all([Solicitar('/proveedores'),Solicitar('/productos')])
      setProveedores(p);setProductos(pr)
      if (!vinculo.productoid&&pr[0]) setVinculo(actual=>({...actual,productoid:String(pr[0].id)}))
    } catch (fallo) { setError(fallo.message) }
  }
  useEffect(()=>{cargar()},[])

  const nuevo=()=>{setSeleccion(null);setFormulario(Vacio);setModal('proveedor')}
  const editar=proveedor=>{setSeleccion(proveedor);setFormulario(Object.fromEntries(Object.keys(Vacio).map(k=>[k,String(proveedor[k]??'')])));setModal('proveedor')}
  const abrirVinculo=proveedor=>{setSeleccion(proveedor);setVinculo({...VinculoVacio,productoid:String(productos[0]?.id||'')});setModal('vinculo')}

  const guardar=async evento=>{
    evento.preventDefault();setError('')
    try {
      await Solicitar(seleccion?`/proveedores/${seleccion.id}`:'/proveedores',{method:seleccion?'PUT':'POST',body:JSON.stringify(formulario)})
      setModal('');setCorrecto('Proveedor guardado');await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const guardarVinculo=async evento=>{
    evento.preventDefault();setError('')
    try {
      await Solicitar(`/proveedores/${seleccion.id}/productos`,{method:'POST',body:JSON.stringify(vinculo)})
      setModal('');setCorrecto('Producto vinculado');await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const estado=async proveedor=>{
    try { await Solicitar(`/proveedores/${proveedor.id}/estado`,{method:'PATCH'});await cargar() } catch (fallo) { setError(fallo.message) }
  }

  const quitar=async (proveedor,vinculoid)=>{
    try { await Solicitar(`/proveedores/${proveedor.id}/productos/${vinculoid}`,{method:'DELETE'});await cargar() } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina">
    <Titulo titulo="Proveedores" descripcion="Datos comerciales, descuentos de lanzamiento y productos ofrecidos" accion={<button className="principal" onClick={nuevo}>Nuevo proveedor</button>}/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tarjetas">{proveedores.map(proveedor=><article className="tarjetaproveedor" key={proveedor.id}>
      <div className="cabeceratarjeta"><div><h3>{proveedor.razonsocial}</h3><small>RUC {proveedor.ruc}</small></div><Estado valor={proveedor.activo?'Activo':'Bloqueado'}/></div>
      <p><b>Contacto:</b> {proveedor.contacto}</p><p>{proveedor.telefono} · {proveedor.correo}</p><p>{proveedor.ubicacion}</p>
      <h4>Productos</h4>{proveedor.productos.filter(p=>p.activo).length?<div className="listacompacta">{proveedor.productos.filter(p=>p.activo).map(p=><div key={p.id}><span><b>{p.codigo}</b> {p.producto}</span><span>Lista S/ {Number(p.preciohabitual).toFixed(2)} · Efectivo S/ {Number(p.precioefectivo).toFixed(2)}{Number(p.descuentolanzamiento)>0&&` · Lanzamiento -${Number(p.descuentolanzamiento).toFixed(0)} %`} · {p.diasentrega} días · {Number(p.puntaje).toFixed(1)}/5 <button className="enlacepeligro" onClick={()=>quitar(proveedor,p.id)}>Quitar</button></span></div>)}</div>:<p className="vacio">Sin productos asociados</p>}
      <div className="accionesfila"><button className="secundario" onClick={()=>editar(proveedor)}>Editar</button><button className="secundario" onClick={()=>abrirVinculo(proveedor)}>Agregar producto</button><button className="secundario peligrotexto" onClick={()=>estado(proveedor)}>{proveedor.activo?'Bloquear':'Activar'}</button></div>
    </article>)}</div>
    {modal==='proveedor'&&<Modal titulo={seleccion?'Editar proveedor':'Nuevo proveedor'} cerrar={()=>setModal('')}><form onSubmit={guardar}>
      <Campo etiqueta="Razón social" value={formulario.razonsocial} onChange={e=>setFormulario({...formulario,razonsocial:e.target.value.slice(0,160)})} required/>
      <Campo etiqueta="RUC" inputMode="numeric" pattern="[0-9]{11}" value={formulario.ruc} onChange={e=>setFormulario({...formulario,ruc:e.target.value.replace(/\D/g,'').slice(0,11)})} required/>
      <Campo etiqueta="Contacto" value={formulario.contacto} onChange={e=>setFormulario({...formulario,contacto:e.target.value.slice(0,120)})} required/>
      <Campo etiqueta="Teléfono" inputMode="tel" value={formulario.telefono} onChange={e=>setFormulario({...formulario,telefono:e.target.value.replace(/[^+0-9]/g,'').slice(0,15)})} required/>
      <Campo etiqueta="Correo" type="email" value={formulario.correo} onChange={e=>setFormulario({...formulario,correo:e.target.value.slice(0,160)})} required/>
      <Campo etiqueta="Ubicación" value={formulario.ubicacion} onChange={e=>setFormulario({...formulario,ubicacion:e.target.value.slice(0,220)})} required/>
      <button className="principal">Guardar</button>
    </form></Modal>}
    {modal==='vinculo'&&<Modal titulo={`Producto de ${seleccion.razonsocial}`} cerrar={()=>setModal('')}><form onSubmit={guardarVinculo}>
      <label className="campo"><span>Producto</span><select value={vinculo.productoid} onChange={e=>setVinculo({...vinculo,productoid:e.target.value})}>{productos.filter(p=>p.activo).map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</select></label>
      <Campo etiqueta="Precio habitual" type="number" min="0" step="0.01" value={vinculo.preciohabitual} onChange={e=>setVinculo({...vinculo,preciohabitual:e.target.value})} required/>
      <Campo etiqueta="Descuento de lanzamiento %" type="number" min="0" max="100" step="0.01" value={vinculo.descuentolanzamiento} onChange={e=>setVinculo({...vinculo,descuentolanzamiento:e.target.value})} required/>
      <small className="ayuda">El ranking evalúa el precio efectivo después de este descuento.</small>
      <Campo etiqueta="Días de entrega" type="number" min="1" max="365" value={vinculo.diasentrega} onChange={e=>setVinculo({...vinculo,diasentrega:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Pedidos anteriores" type="number" min="0" value={vinculo.pedidosanteriores} onChange={e=>setVinculo({...vinculo,pedidosanteriores:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Puntaje interno" type="number" min="1" max="5" step="0.1" value={vinculo.puntaje} onChange={e=>setVinculo({...vinculo,puntaje:e.target.value})} required/>
      <button className="principal">Vincular producto</button>
    </form></Modal>}
  </div>
}