import { useEffect,useMemo,useState } from 'react'
import { Search,ShoppingCart,X } from 'lucide-react'
import { Solicitar } from '../Servicios/Api'
import { Campo } from '../Componentes/Campo'
import { CalcularLinea } from '../Servicios/Descuentos'
import { CorreoValido } from '../Validaciones/Reglas'

const FiltrosVacios={tipoproducto:'',material:'',grosor:'',dimensiones:''}

function ValoresUnicos(productos,campo) {
  return [...new Set(productos.map(producto=>producto[campo]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))
}

export function Catalogo() {
  const [productos,setProductos] = useState([])
  const [busqueda,setBusqueda] = useState('')
  const [filtros,setFiltros] = useState(FiltrosVacios)
  const [carrito,setCarrito] = useState([])
  const [mostrar,setMostrar] = useState(false)
  const [mensaje,setMensaje] = useState('')

  useEffect(() => {
    Solicitar('/catalogo').then(setProductos).catch(error=>setMensaje(error.message))
  },[])

  const disponibles=useMemo(()=>{
    const porTipo=filtros.tipoproducto?productos.filter(p=>p.tipoproducto===filtros.tipoproducto):productos
    const porMaterial=filtros.material?porTipo.filter(p=>p.material===filtros.material):porTipo
    const porGrosor=filtros.grosor?porMaterial.filter(p=>p.grosor===filtros.grosor):porMaterial
    return {
      tipos:ValoresUnicos(productos,'tipoproducto'),
      materiales:ValoresUnicos(porTipo,'material'),
      grosores:ValoresUnicos(porMaterial,'grosor'),
      dimensiones:ValoresUnicos(porGrosor,'dimensiones')
    }
  },[productos,filtros.tipoproducto,filtros.material,filtros.grosor])

  const lista = useMemo(() => {
    const termino=busqueda.trim().toLowerCase()
    return productos.filter(producto=>{
      const coincideTexto=!termino||[producto.nombre,producto.descripcion,producto.codigo,producto.material]
        .some(valor=>String(valor||'').toLowerCase().includes(termino))
      return coincideTexto&&
        (!filtros.tipoproducto||producto.tipoproducto===filtros.tipoproducto)&&
        (!filtros.material||producto.material===filtros.material)&&
        (!filtros.grosor||producto.grosor===filtros.grosor)&&
        (!filtros.dimensiones||producto.dimensiones===filtros.dimensiones)
    })
  },[productos,busqueda,filtros])

  const cambiarFiltro=(campo,valor)=>{
    setFiltros(actual=>{
      if (campo==='tipoproducto') return {tipoproducto:valor,material:'',grosor:'',dimensiones:''}
      if (campo==='material') return {...actual,material:valor,grosor:'',dimensiones:''}
      if (campo==='grosor') return {...actual,grosor:valor,dimensiones:''}
      return {...actual,[campo]:valor}
    })
  }

  const agregar = producto => setCarrito(actual => {
    const existente = actual.find(item=>item.productoid===producto.id)
    if (!existente) {
      return [...actual,{
        productoid:producto.id,
        nombre:producto.nombre,
        precio:Number(producto.precioventa),
        descuentofijo:Number(producto.descuentoventa),
        stock:Number(producto.stockdisponible),
        maximo:Number(producto.maximopedido),
        cantidad:1
      }]
    }
    return actual.map(item=>item.productoid===producto.id
      ? {...item,cantidad:Math.min(item.maximo,item.cantidad+1)}
      : item
    )
  })

  return <div className="catalogo">
    <header>
      <b>ALMACÉN ÁGIL</b>
      <nav>
        <a href="#inicio">Inicio</a>
        <a href="#productos">Productos</a>
        <a href="#contacto">Contacto</a>
      </nav>
      <button type="button" onClick={()=>setMostrar(true)}>
        <ShoppingCart/> {carrito.reduce((suma,item)=>suma+item.cantidad,0)}
      </button>
      <a className="portal" href="?portal=1">Portal empleado</a>
    </header>
    <section id="inicio" className="portada">
      <div>
        <h1>Todo para tu oficina</h1>
        <p>Distribución mayorista y cotizaciones personalizadas.</p>
        <a href="#productos">Ver catálogo</a>
      </div>
    </section>
    <section id="productos" className="contenido">
      <h2>Catálogo de productos</h2>
      <div className="buscador">
        <Search/>
        <input
          value={busqueda}
          onChange={evento=>setBusqueda(evento.target.value.slice(0,80))}
          placeholder="Buscar por nombre, código o material"
          maxLength="80"
        />
      </div>
      <div className="filtroscatalogo">
        <Filtro nombre="Tipo de producto" valor={filtros.tipoproducto} opciones={disponibles.tipos} cambiar={valor=>cambiarFiltro('tipoproducto',valor)}/>
        <Filtro nombre="Material" valor={filtros.material} opciones={disponibles.materiales} cambiar={valor=>cambiarFiltro('material',valor)}/>
        <Filtro nombre="Grosor" valor={filtros.grosor} opciones={disponibles.grosores} cambiar={valor=>cambiarFiltro('grosor',valor)}/>
        <Filtro nombre="Dimensiones" valor={filtros.dimensiones} opciones={disponibles.dimensiones} cambiar={valor=>cambiarFiltro('dimensiones',valor)}/>
        <button type="button" className="limpiarfiltros" onClick={()=>setFiltros(FiltrosVacios)}>Limpiar filtros</button>
      </div>
      <div className="productos">
        {lista.map(producto=><article key={producto.id}>
          {producto.imagen?<img className="imagenproducto real" src={producto.imagen} alt={producto.nombre}/>:<div className="imagenproducto">{producto.nombre.slice(0,2).toUpperCase()}</div>}
          <span>{producto.tipoproducto}</span>
          <h3>{producto.nombre}</h3>
          <p>{producto.descripcion}</p>
          <div className="atributosproducto"><small>{producto.material}</small><small>{producto.grosor}</small><small>{producto.dimensiones}</small></div>
          <b>S/ {Number(producto.preciofinal).toFixed(2)}</b>
          {Number(producto.descuentoventa)>0&&<small className="descuento">{Number(producto.descuentoventa).toFixed(0)} % de descuento fijo</small>}
          <small className="volumen">5–10: 10 % · 11–20: 15 % · 21+: 20 %</small>
          <small className="limitepedido">Máximo {producto.maximopedido} por producto</small>
          <button type="button" onClick={()=>agregar(producto)}>
            {Number(producto.stockdisponible)===0?'Solicitar con reposición':'Agregar al carrito'}
          </button>
        </article>)}
      </div>
      {!lista.length&&<p className="sinfiltros">No hay productos que coincidan con los filtros.</p>}
    </section>
    <footer id="contacto">
      <b>ALMACÉN ÁGIL</b>
      <p>Distribución mayorista de suministros para empresas.</p>
    </footer>
    {mostrar&&<Cotizador
      carrito={carrito}
      setCarrito={setCarrito}
      cerrar={()=>setMostrar(false)}
      finalizado={texto=>{
        setMensaje(texto)
        setMostrar(false)
        setCarrito([])
      }}
    />}
    {mensaje&&<button className="aviso" type="button" onClick={()=>setMensaje('')}>{mensaje}</button>}
  </div>
}

function Filtro({nombre,valor,opciones,cambiar}) {
  return <label><span>{nombre}</span><select value={valor} onChange={evento=>cambiar(evento.target.value)}><option value="">Todos</option>{opciones.map(opcion=><option key={opcion}>{opcion}</option>)}</select></label>
}

function Cotizador({carrito,setCarrito,cerrar,finalizado}) {
  const [datos,setDatos] = useState({cliente:'',documento:'',telefono:'',correo:''})
  const [error,setError] = useState('')
  const [enviando,setEnviando] = useState(false)
  const total=carrito.reduce((suma,item)=>suma+CalcularLinea(item.precio,item.cantidad,item.descuentofijo).total,0)

  const enviar = async evento => {
    evento.preventDefault()
    setError('')
    if (!carrito.length) return setError('Agregue al menos un producto')
    if (carrito.some(item=>item.cantidad>item.maximo)) return setError('Una cantidad supera el máximo permitido')
    if (!/^\d{8}$|^\d{11}$/.test(datos.documento)) return setError('Ingrese DNI de 8 o RUC de 11 dígitos')
    if (!/^\d{7,15}$/.test(datos.telefono)) return setError('Teléfono inválido')
    if (!CorreoValido(datos.correo)) return setError('Correo inválido')
    try {
      setEnviando(true)
      const cuerpo = {
        cliente:datos.cliente,
        telefono:datos.telefono,
        correo:datos.correo,
        productos:carrito.map(({productoid,cantidad})=>({productoid,cantidad})),
        ...(datos.documento.length===8?{dni:datos.documento}:{ruc:datos.documento})
      }
      const respuesta = await Solicitar('/cotizaciones',{method:'POST',body:JSON.stringify(cuerpo)})
      finalizado(`Cotización N.° ${respuesta.id} registrada`)
    } catch (errorSolicitud) {
      setError(errorSolicitud.message)
    } finally {
      setEnviando(false)
    }
  }

  return <div className="modal">
    <form onSubmit={enviar}>
      <button type="button" className="cerrar" onClick={cerrar}><X/></button>
      <h2>Solicitar cotización</h2>
      {carrito.map(item=>{
        const calculo=CalcularLinea(item.precio,item.cantidad,item.descuentofijo)
        return <div className="lineacarrito detalladacarrito" key={item.productoid}>
          <div><b>{item.nombre}</b><small>Base S/ {calculo.subtotal.toFixed(2)} · Fijo {calculo.fijo}% · Volumen {calculo.volumen}%</small><strong>S/ {calculo.total.toFixed(2)}</strong></div>
          <input
            type="number"
            min="1"
            max={item.maximo}
            step="1"
            value={item.cantidad}
            onChange={evento=>setCarrito(actual=>actual.map(producto=>producto.productoid===item.productoid
              ? {...producto,cantidad:Math.max(1,Math.min(item.maximo,Number(evento.target.value)||1))}
              : producto
            ))}
          />
        </div>
      })}
      {!!carrito.length&&<div className="totalcarrito"><span>Total estimado</span><b>S/ {total.toFixed(2)}</b></div>}
      <Campo etiqueta="Nombre o empresa" value={datos.cliente} onChange={evento=>setDatos({...datos,cliente:evento.target.value.slice(0,160)})} minLength="3" maxLength="160" required/>
      <Campo etiqueta="DNI o RUC" inputMode="numeric" pattern="[0-9]{8}|[0-9]{11}" value={datos.documento} onChange={evento=>setDatos({...datos,documento:evento.target.value.replace(/\D/g,'').slice(0,11)})} required/>
      <Campo etiqueta="Teléfono" inputMode="numeric" pattern="[0-9]{7,15}" value={datos.telefono} onChange={evento=>setDatos({...datos,telefono:evento.target.value.replace(/\D/g,'').slice(0,15)})} required/>
      <Campo etiqueta="Correo" type="email" value={datos.correo} onChange={evento=>setDatos({...datos,correo:evento.target.value.slice(0,160)})} maxLength="160" required/>
      {error&&<div className="mensajeerror">{error}</div>}
      <button className="principal" disabled={!carrito.length||enviando}>{enviando?'Enviando...':'Enviar cotización'}</button>
    </form>
  </div>
}