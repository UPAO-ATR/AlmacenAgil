import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Mensaje,Modal,Estado,Titulo,FormatoFecha } from '../../Componentes/Comun'
import { UsarSesion } from '../../Contextos/Sesion'
import { Solicitar } from '../../Servicios/Api'

const Materiales={
  Papel:['Bond','Folcote','Manteca','Avena','Kraft','Dúplex'],
  'Cartón':['Prensado','Microcorrugado','Corrugado'],
  Sobres:['Bond','Manila'],
  Otros:['No especificado']
}
const Grosores=['70 g','75 g','80 g','90 g','110 g','120 g','C10','C12','1 mm','2 mm','3 mm','4 mm','No aplica']
const Dimensiones=['A4','A5','A6','1/4','1/2','Oficio','Carta','40 cm x 60 cm','50 cm x 70 cm','No especificada']
const ProductoVacio={codigo:'',nombre:'',descripcion:'',categoriaid:'1',tipoproducto:'Papel',material:'Bond',grosor:'75 g',dimensiones:'A4',maximopedido:'100',precioventa:'',preciocompra:'',descuentoventa:'0',descuentocompra:'0',stockactual:'0',stockminimo:'0',stockmensual:'0',imagen:''}

export function Inventario() {
  const { usuario }=UsarSesion()
  const administrador=usuario.rol==='Administrador'
  const [productos,setProductos]=useState([])
  const [categorias,setCategorias]=useState([])
  const [movimientos,setMovimientos]=useState([])
  const [modalProducto,setModalProducto]=useState(false)
  const [modalMovimiento,setModalMovimiento]=useState(false)
  const [editando,setEditando]=useState(null)
  const [formulario,setFormulario]=useState(ProductoVacio)
  const [movimiento,setMovimiento]=useState({productoid:'',tipo:'Entrada',cantidad:'1',motivo:''})
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const cargar=async()=>{
    try {
      const [p,c,m]=await Promise.all([Solicitar('/productos'),Solicitar('/categorias'),Solicitar('/movimientos')])
      setProductos(p);setCategorias(c);setMovimientos(m)
      if (!movimiento.productoid&&p[0]) setMovimiento(actual=>({...actual,productoid:String(p[0].id)}))
    } catch (fallo) { setError(fallo.message) }
  }

  useEffect(()=>{cargar()},[])

  const abrirNuevo=()=>{
    setEditando(null)
    setFormulario({...ProductoVacio,categoriaid:String(categorias[0]?.id||1)})
    setModalProducto(true)
  }

  const abrirEditar=producto=>{
    setEditando(producto)
    setFormulario(Object.fromEntries(Object.keys(ProductoVacio).map(clave=>[clave,String(producto[clave]??ProductoVacio[clave])])) )
    setModalProducto(true)
  }

  const cambiarTipo=tipoproducto=>{
    const material=Materiales[tipoproducto]?.[0]||'No especificado'
    setFormulario(actual=>({...actual,tipoproducto,material,grosor:tipoproducto==='Sobres'?'No aplica':actual.grosor,dimensiones:tipoproducto==='Sobres'?'Oficio':actual.dimensiones}))
  }

  const leerImagen=archivo=>{
    if (!archivo) return
    if (!['image/png','image/jpeg','image/webp'].includes(archivo.type)||archivo.size>500000) return setError('Use una imagen PNG, JPG o WEBP de máximo 500 KB')
    const lector=new FileReader()
    lector.onload=()=>setFormulario(actual=>({...actual,imagen:String(lector.result)}))
    lector.readAsDataURL(archivo)
  }

  const guardarProducto=async evento=>{
    evento.preventDefault();setError('');setCorrecto('')
    try {
      await Solicitar(editando?`/productos/${editando.id}`:'/productos',{method:editando?'PUT':'POST',body:JSON.stringify(formulario)})
      setModalProducto(false);setCorrecto('Producto guardado');await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const desactivar=async producto=>{
    if (!confirm(`¿Desactivar ${producto.nombre}?`)) return
    try { await Solicitar(`/productos/${producto.id}`,{method:'DELETE'});await cargar() } catch (fallo) { setError(fallo.message) }
  }

  const guardarMovimiento=async evento=>{
    evento.preventDefault();setError('');setCorrecto('')
    try {
      await Solicitar('/movimientos',{method:'POST',body:JSON.stringify(movimiento)})
      setModalMovimiento(false);setCorrecto('Movimiento registrado');setMovimiento(actual=>({...actual,cantidad:'1',motivo:''}));await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina">
    <Titulo titulo="Inventario" descripcion="Existencias, clasificación comercial, límites, descuentos e imágenes" accion={<div className="accionescabecera"><button className="secundario" onClick={()=>setModalMovimiento(true)}>Registrar movimiento</button>{administrador&&<button className="principal" onClick={abrirNuevo}>Nuevo producto</button>}</div>}/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tabla"><table>
      <thead><tr><th>Producto</th><th>Clasificación</th><th>Stock</th><th>Reservado</th><th>Disponible</th><th>Máximo pedido</th><th>Precio final</th><th>Estado</th>{administrador&&<th>Acciones</th>}</tr></thead>
      <tbody>{productos.map(producto=><tr key={producto.id}>
        <td><div className="productocelda">{producto.imagen?<img src={producto.imagen} alt=""/>:<span>{producto.codigo.slice(0,2)}</span>}<div><b>{producto.nombre}</b><small>{producto.codigo} · {producto.categoria}</small></div></div></td>
        <td><b>{producto.tipoproducto}</b><small>{producto.material} · {producto.grosor} · {producto.dimensiones}</small></td>
        <td>{producto.stockactual}</td><td>{producto.stockreservado}</td><td>{producto.stockdisponible}</td><td>{producto.maximopedido}</td>
        <td>S/ {Number(producto.preciofinal).toFixed(2)}{Number(producto.descuentoventa)>0&&<small className="linea">-{Number(producto.descuentoventa).toFixed(0)} % fijo</small>}</td>
        <td><Estado valor={Number(producto.stockdisponible)===0?'Agotado':Number(producto.stockdisponible)<=Number(producto.stockminimo)?'Crítico':'Normal'}/></td>
        {administrador&&<td className="accionesfila"><button className="secundario" onClick={()=>abrirEditar(producto)}>Editar</button>{producto.activo&&<button className="secundario peligrotexto" onClick={()=>desactivar(producto)}>Desactivar</button>}</td>}
      </tr>)}</tbody>
    </table></div>
    <div className="seccionsecundaria"><h2>Últimos movimientos</h2><div className="tabla"><table>
      <thead><tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th><th>Fecha</th></tr></thead>
      <tbody>{movimientos.map(item=><tr key={item.id}><td>{item.producto}</td><td>{item.tipo}</td><td>{item.cantidad}</td><td>{item.motivo}</td><td>{item.usuario||'Sistema'}</td><td><FormatoFecha valor={item.creadoen}/></td></tr>)}</tbody>
    </table></div></div>
    {modalProducto&&<Modal titulo={editando?'Editar producto':'Nuevo producto'} cerrar={()=>setModalProducto(false)} ancho><form onSubmit={guardarProducto} className="rejilla">
      <Campo etiqueta="Código" value={formulario.codigo} onChange={e=>setFormulario({...formulario,codigo:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,20)})} minLength="3" required/>
      <Campo etiqueta="Nombre" value={formulario.nombre} onChange={e=>setFormulario({...formulario,nombre:e.target.value.slice(0,120)})} minLength="3" required/>
      <label className="campo"><span>Grupo interno</span><select value={formulario.categoriaid} onChange={e=>setFormulario({...formulario,categoriaid:e.target.value})}>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label className="campo"><span>Tipo de producto</span><select value={formulario.tipoproducto} onChange={e=>cambiarTipo(e.target.value)}>{['Papel','Cartón','Sobres','Otros'].map(tipo=><option key={tipo}>{tipo}</option>)}</select></label>
      <label className="campo"><span>Material</span><input list="materialesproducto" value={formulario.material} onChange={e=>setFormulario({...formulario,material:e.target.value.slice(0,80)})} maxLength="80" required/><datalist id="materialesproducto">{Materiales[formulario.tipoproducto]?.map(valor=><option key={valor} value={valor}/>)}</datalist></label>
      <label className="campo"><span>Grosor</span><input list="grosoresproducto" value={formulario.grosor} onChange={e=>setFormulario({...formulario,grosor:e.target.value.slice(0,40)})} maxLength="40" required/><datalist id="grosoresproducto">{Grosores.map(valor=><option key={valor} value={valor}/>)}</datalist></label>
      <label className="campo"><span>Dimensiones</span><input list="dimensionesproducto" value={formulario.dimensiones} onChange={e=>setFormulario({...formulario,dimensiones:e.target.value.slice(0,80)})} maxLength="80" required/><datalist id="dimensionesproducto">{Dimensiones.map(valor=><option key={valor} value={valor}/>)}</datalist></label>
      <Campo etiqueta="Máximo por pedido" type="number" min="1" max="10000" value={formulario.maximopedido} onChange={e=>setFormulario({...formulario,maximopedido:e.target.value.replace(/\D/g,'').slice(0,5)})} required/>
      <Campo etiqueta="Descripción" className="ancho" value={formulario.descripcion} onChange={e=>setFormulario({...formulario,descripcion:e.target.value.slice(0,500)})} maxLength="500"/>
      {['precioventa','preciocompra'].map(campo=><Campo key={campo} etiqueta={campo==='precioventa'?'Precio venta':'Precio compra'} inputMode="decimal" value={formulario[campo]} onChange={e=>setFormulario({...formulario,[campo]:e.target.value.replace(/[^0-9.]/g,'').slice(0,12)})} required/>)}
      {['descuentoventa','descuentocompra'].map(campo=><Campo key={campo} etiqueta={campo==='descuentoventa'?'Descuento fijo al cliente %':'Descuento de compra fijo %'} type="number" min="0" max="100" step="0.01" value={formulario[campo]} onChange={e=>setFormulario({...formulario,[campo]:e.target.value})} required/>)}
      {['stockactual','stockminimo','stockmensual'].map(campo=><Campo key={campo} etiqueta={campo==='stockactual'?'Stock actual':campo==='stockminimo'?'Stock mínimo':'Stock mensual'} type="number" min="0" max="1000000" value={formulario[campo]} onChange={e=>setFormulario({...formulario,[campo]:e.target.value.replace(/\D/g,'')})} required/>)}
      <div className="panelinformativo ancho"><b>Descuento por volumen automático</b><span>5 a 10 unidades: 10 % · 11 a 20: 15 % · 21 o más: 20 %</span></div>
      <label className="campo ancho"><span>Imagen del producto</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>leerImagen(e.target.files[0])}/><small>Máximo 500 KB</small></label>
      {formulario.imagen&&<div className="previsualizacion ancho"><img src={formulario.imagen} alt="Previsualización"/><button type="button" className="secundario" onClick={()=>setFormulario({...formulario,imagen:''})}>Quitar imagen</button></div>}
      <button className="principal ancho">Guardar producto</button>
    </form></Modal>}
    {modalMovimiento&&<Modal titulo="Registrar movimiento" cerrar={()=>setModalMovimiento(false)}><form onSubmit={guardarMovimiento}>
      <label className="campo"><span>Producto</span><select value={movimiento.productoid} onChange={e=>setMovimiento({...movimiento,productoid:e.target.value})}>{productos.filter(p=>p.activo).map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</select></label>
      <label className="campo"><span>Tipo</span><select value={movimiento.tipo} onChange={e=>setMovimiento({...movimiento,tipo:e.target.value})}>{['Entrada','Salida','Merma','Ajuste'].map(t=><option key={t}>{t}</option>)}</select></label>
      <Campo etiqueta="Cantidad" type="number" min="1" max="1000000" value={movimiento.cantidad} onChange={e=>setMovimiento({...movimiento,cantidad:e.target.value.replace(/\D/g,'')})} required/>
      <Campo etiqueta="Motivo" value={movimiento.motivo} onChange={e=>setMovimiento({...movimiento,motivo:e.target.value.slice(0,250)})} minLength="3" maxLength="250" required/>
      <button className="principal">Registrar</button>
    </form></Modal>}
  </div>
}