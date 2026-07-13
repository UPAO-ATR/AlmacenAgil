import { useEffect,useMemo,useState } from 'react'
import { Search,ShoppingCart,X } from 'lucide-react'
import { Solicitar } from '../Servicios/Api'
import { Campo } from '../Componentes/Campo'
import { CorreoValido } from '../Validaciones/Reglas'

export function Catalogo() {
  const [productos,setProductos] = useState([])
  const [busqueda,setBusqueda] = useState('')
  const [carrito,setCarrito] = useState([])
  const [mostrar,setMostrar] = useState(false)
  const [mensaje,setMensaje] = useState('')

  useEffect(() => {
    Solicitar('/catalogo').then(setProductos).catch(error=>setMensaje(error.message))
  },[])

  const lista = useMemo(
    () => productos.filter(producto=>producto.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [productos,busqueda]
  )

  const agregar = producto => setCarrito(actual => {
    const existente = actual.find(item=>item.productoid===producto.id)
    if (!existente) {
      return [...actual,{
        productoid: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.preciofinal),
        stock: Number(producto.stockdisponible),
        cantidad: 1
      }]
    }
    return actual.map(item=>item.productoid===producto.id
      ? {...item,cantidad:Math.min(item.stock,10000,item.cantidad+1)}
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
          placeholder="Buscar productos por nombre"
          maxLength="80"
        />
      </div>
      <div className="productos">
        {lista.map(producto=><article key={producto.id}>
          {producto.imagen?<img className="imagenproducto real" src={producto.imagen} alt={producto.nombre}/>:<div className="imagenproducto">{producto.nombre.slice(0,2).toUpperCase()}</div>}
          <span>{producto.categoria}</span>
          <h3>{producto.nombre}</h3>
          <p>{producto.descripcion}</p>
          <b>S/ {Number(producto.preciofinal).toFixed(2)}</b>{Number(producto.descuentoventa)>0&&<small className="descuento">{Number(producto.descuentoventa).toFixed(0)} % de descuento</small>}
          <button
            type="button"
            disabled={Number(producto.stockdisponible)===0}
            onClick={()=>agregar(producto)}
          >
            {Number(producto.stockdisponible)===0?'Sin stock':'Agregar al carrito'}
          </button>
        </article>)}
      </div>
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

function Cotizador({carrito,setCarrito,cerrar,finalizado}) {
  const [datos,setDatos] = useState({cliente:'',documento:'',telefono:'',correo:''})
  const [error,setError] = useState('')
  const [enviando,setEnviando] = useState(false)

  const enviar = async evento => {
    evento.preventDefault()
    setError('')
    if (!carrito.length) return setError('Agregue al menos un producto')
    if (!/^\d{8}$|^\d{11}$/.test(datos.documento)) {
      return setError('Ingrese DNI de 8 o RUC de 11 dígitos')
    }
    if (!/^\d{7,15}$/.test(datos.telefono)) return setError('Teléfono inválido')
    if (!CorreoValido(datos.correo)) return setError('Correo inválido')
    try {
      setEnviando(true)
      const cuerpo = {
        cliente: datos.cliente,
        telefono: datos.telefono,
        correo: datos.correo,
        productos: carrito.map(({productoid,cantidad})=>({productoid,cantidad})),
        ...(datos.documento.length===8?{dni:datos.documento}:{ruc:datos.documento})
      }
      const respuesta = await Solicitar('/cotizaciones',{
        method:'POST',
        body:JSON.stringify(cuerpo)
      })
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
      {carrito.map(item=><div className="lineacarrito" key={item.productoid}>
        <span>{item.nombre}</span>
        <input
          type="number"
          min="1"
          max={item.stock}
          step="1"
          value={item.cantidad}
          onChange={evento=>setCarrito(actual=>actual.map(producto=>producto.productoid===item.productoid
            ? {...producto,cantidad:Math.max(1,Math.min(item.stock,10000,Number(evento.target.value)||1))}
            : producto
          ))}
        />
      </div>)}
      <Campo
        etiqueta="Nombre o empresa"
        value={datos.cliente}
        onChange={evento=>setDatos({...datos,cliente:evento.target.value.slice(0,160)})}
        minLength="3"
        maxLength="160"
        required
      />
      <Campo
        etiqueta="DNI o RUC"
        inputMode="numeric"
        pattern="[0-9]{8}|[0-9]{11}"
        value={datos.documento}
        onChange={evento=>setDatos({...datos,documento:evento.target.value.replace(/\D/g,'').slice(0,11)})}
        required
      />
      <Campo
        etiqueta="Teléfono"
        inputMode="numeric"
        pattern="[0-9]{7,15}"
        value={datos.telefono}
        onChange={evento=>setDatos({...datos,telefono:evento.target.value.replace(/\D/g,'').slice(0,15)})}
        required
      />
      <Campo
        etiqueta="Correo"
        type="email"
        value={datos.correo}
        onChange={evento=>setDatos({...datos,correo:evento.target.value.slice(0,160)})}
        maxLength="160"
        required
      />
      {error&&<div className="mensajeerror">{error}</div>}
      <button className="principal" disabled={!carrito.length||enviando}>
        {enviando?'Enviando...':'Enviar cotización'}
      </button>
    </form>
  </div>
}