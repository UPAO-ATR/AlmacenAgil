import { useEffect,useState } from 'react'
import { Estado,FormatoFecha,Mensaje,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'

export function Notificaciones() {
  const [datos,setDatos]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{Solicitar('/notificaciones').then(setDatos).catch(fallo=>setError(fallo.message))},[])
  return <div className="pagina">
    <Titulo titulo="Correos y notificaciones" descripcion="Registro de activaciones, avisos al cliente y vouchers enviados a proveedores"/>
    <Mensaje error={error}/>
    <div className="tabla"><table><thead><tr><th>Tipo</th><th>Destinatario</th><th>Asunto</th><th>Estado</th><th>Error</th><th>Fecha</th></tr></thead><tbody>{datos.map(item=><tr key={item.id}><td>{item.tipo}</td><td>{item.destinatario}</td><td><b>{item.asunto}</b><small className="linea recorte">{item.cuerpo}</small></td><td><Estado valor={item.estado}/></td><td>{item.error||'—'}</td><td><FormatoFecha valor={item.enviadoen||item.creadoen}/></td></tr>)}</tbody></table></div>
  </div>
}