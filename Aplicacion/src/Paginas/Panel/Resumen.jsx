import { useEffect,useState } from 'react'
import { AlertTriangle,Boxes,CalendarClock,ClipboardList,Mail,PackageCheck,Truck } from 'lucide-react'
import { Solicitar } from '../../Servicios/Api'
import { Titulo,Mensaje } from '../../Componentes/Comun'
import { UsarSesion } from '../../Contextos/Sesion'

export function Resumen({setPagina}) {
  const { usuario }=UsarSesion()
  const [resumen,setResumen]=useState({})
  const [error,setError]=useState('')
  useEffect(()=>{Solicitar('/resumen').then(setResumen).catch(fallo=>setError(fallo.message))},[])
  return <div className="pagina">
    <Titulo titulo="Panel general" descripcion="Estado actual de ventas, inventario y abastecimiento"/>
    <Mensaje error={error}/>
    <div className="metricas">
      <Metrica icono={Boxes} nombre="Productos activos" valor={resumen.productos}/>
      <Metrica icono={AlertTriangle} nombre="Alertas de stock" valor={resumen.alertas}/>
      <Metrica icono={ClipboardList} nombre="Cotizaciones por atender" valor={resumen.cotizaciones}/>
      <Metrica icono={Truck} nombre="Reabastecimientos" valor={resumen.reabastecimientos}/>
      <Metrica icono={PackageCheck} nombre="Pedidos en preparación" valor={resumen.preparacion}/>
      <Metrica icono={Mail} nombre="Correos pendientes" valor={resumen.correospendientes}/>
      <Metrica icono={CalendarClock} nombre="Auditoría quincenal" valor={resumen.auditoriavencida?'Pendiente':resumen.proximafechaauditoria?new Date(resumen.proximafechaauditoria).toLocaleDateString('es-PE'):'Registrar'}/>
    </div>
    <div className="panel">
      <h2>Accesos rápidos</h2>
      <div className="atajos">
        {['Administrador','JefeAlmacen'].includes(usuario.rol)&&<button onClick={()=>setPagina('inventario')}>Revisar inventario</button>}
        {['Administrador','AsesorVentas','JefeAlmacen'].includes(usuario.rol)&&<button onClick={()=>setPagina('cotizaciones')}>Gestionar cotizaciones</button>}
        {['Administrador','JefeAlmacen'].includes(usuario.rol)&&<button onClick={()=>setPagina('reabastecimientos')}>Ver reabastecimientos</button>}
        {usuario.rol==='Administrador'&&<button onClick={()=>setPagina('usuarios')}>Gestionar trabajadores</button>}
      </div>
    </div>
  </div>
}

function Metrica({icono:Icono,nombre,valor}) {
  return <div className="metrica"><Icono/><div><span>{nombre}</span><b>{valor??'—'}</b></div></div>
}