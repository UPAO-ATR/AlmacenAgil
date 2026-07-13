import { useEffect,useState } from 'react'
import { FormatoFecha,Mensaje,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'

export function Trazabilidad() {
  const [datos,setDatos]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{Solicitar('/auditoriaacciones').then(setDatos).catch(fallo=>setError(fallo.message))},[])
  return <div className="pagina">
    <Titulo titulo="Trazabilidad" descripcion="Acciones sensibles realizadas por usuarios y sistema"/>
    <Mensaje error={error}/>
    <div className="tabla"><table><thead><tr><th>Acción</th><th>Entidad</th><th>Identificador</th><th>Usuario</th><th>Dirección</th><th>Detalle</th><th>Fecha</th></tr></thead><tbody>{datos.map(item=><tr key={item.id}><td>{item.accion}</td><td>{item.entidad}</td><td>{item.entidadid||'—'}</td><td>{item.usuario||'Sistema'}</td><td>{item.direccionip||'—'}</td><td><code>{JSON.stringify(item.detalle)}</code></td><td><FormatoFecha valor={item.creadoen}/></td></tr>)}</tbody></table></div>
  </div>
}