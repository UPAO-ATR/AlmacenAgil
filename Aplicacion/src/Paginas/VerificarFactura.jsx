import { useEffect,useState } from 'react'
import { Campo } from '../Componentes/Campo'
import { Descargar,Solicitar } from '../Servicios/Api'

export function VerificarFactura() {
  const inicial=new URLSearchParams(location.search).get('verificarfactura')||''
  const [codigo,setCodigo]=useState(inicial.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,40))
  const [factura,setFactura]=useState(null)
  const [error,setError]=useState('')
  const [buscando,setBuscando]=useState(false)

  const verificar=async evento=>{
    evento?.preventDefault();setError('');setFactura(null)
    if (!/^[A-Z0-9]{20,40}$/.test(codigo)) return setError('Ingrese un código de factura válido')
    try {
      setBuscando(true)
      const respuesta=await Solicitar(`/facturas/verificar/${codigo}`)
      setFactura(respuesta)
    } catch (fallo) { setError(fallo.message) } finally { setBuscando(false) }
  }

  useEffect(()=>{if (/^[A-Z0-9]{20,40}$/.test(codigo)) verificar()},[])

  return <div className="fondoverificacion"><main className="verificadorfactura">
    <a className="volvercatalogo" href="/">← Volver al catálogo</a>
    <h1>Verificar factura interna</h1>
    <p>Comprueba que el documento coincide con el registro de venta y entrega almacenado por el sistema.</p>
    <form onSubmit={verificar}>
      <Campo etiqueta="Código de verificación" value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,40))} minLength="20" maxLength="40" required/>
      <button className="principal" disabled={buscando}>{buscando?'Verificando...':'Verificar'}</button>
    </form>
    {error&&<div className="mensajeerror bloque">{error}</div>}
    {factura&&<section className="resultadofactura">
      <div className="cabecerafactura"><div><span>Resultado</span><h2>{factura.valida?'Documento válido':'Documento alterado'}</h2></div><b>{factura.numero}</b></div>
      <p className="avisotributario">{factura.aviso}</p>
      <div className="fichas">
        <div><span>Empresa</span><b>{factura.empresa.razonsocial}</b><small>RUC {factura.empresa.ruc}</small></div>
        <div><span>Cliente</span><b>{factura.cliente.nombre}</b><small>{factura.cliente.tipodocumento} {factura.cliente.documento}</small></div>
        <div><span>Cotización</span><b>N.° {factura.cotizacionid}</b><small>Entregada: {new Date(factura.entregadaen).toLocaleString('es-PE')}</small></div>
        <div><span>Total</span><b>S/ {Number(factura.total).toFixed(2)}</b><small>Emitida: {new Date(factura.emitidaen).toLocaleString('es-PE')}</small></div>
      </div>
      <div className="tabla"><table><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Subtotal</th></tr></thead><tbody>{factura.productos.map((item,indice)=><tr key={`${item.codigo}-${indice}`}><td>{item.codigo}</td><td>{item.nombre}</td><td>{item.cantidad}</td><td>S/ {Number(item.subtotal).toFixed(2)}</td></tr>)}</tbody></table></div>
      <div className="datosverificacion"><span>Código</span><code>{factura.codigo}</code><span>Huella</span><code>{factura.huella}</code></div>
      <button className="principal" onClick={()=>Descargar(`/facturas/${factura.codigo}/pdf`,`${factura.numero}.pdf`)}>Descargar PDF</button>
    </section>}
  </main></div>
}
