import { Boxes,ClipboardCheck,ClipboardList,History,LayoutDashboard,LogOut,Mail,PackageCheck,Settings,ShoppingCart,Truck,Users } from 'lucide-react'
import { UsarSesion } from '../Contextos/Sesion'

const Opciones=[
  ['resumen','Resumen',LayoutDashboard],
  ['cotizaciones','Cotizaciones',ClipboardList],
  ['inventario','Inventario',Boxes],
  ['reabastecimientos','Reabastecimiento',Truck],
  ['proveedores','Proveedores',ShoppingCart],
  ['usuarios','Trabajadores',Users],
  ['recepciones','Recepciones',PackageCheck],
  ['auditorias','Auditorías',ClipboardCheck],
  ['notificaciones','Correos',Mail],
  ['trazabilidad','Trazabilidad',History],
  ['configuracion','Configuración',Settings]
]

const Permisos={
  Administrador:Opciones.map(([id])=>id),
  AsesorVentas:['resumen','cotizaciones','notificaciones','configuracion'],
  JefeAlmacen:['resumen','cotizaciones','inventario','reabastecimientos','recepciones','auditorias','notificaciones','configuracion']
}

export function Marco({pagina,setPagina,children}) {
  const { usuario,salir }=UsarSesion()
  const visibles=Opciones.filter(([id])=>(usuario.debecambiarclave?['configuracion']:Permisos[usuario.rol]||[]).includes(id))
  return <div className="estructura">
    <aside>
      <div className="marca"><img src="/icono.png" alt="" className="logoicono"/><b>ELIM-ALMACÉN</b></div>
      <nav>{visibles.map(([id,nombre,Icono])=><button key={id} className={pagina===id?'activo':''} onClick={()=>setPagina(id)}><Icono size={19}/>{nombre}</button>)}</nav>
      <div className="perfil">
        <b>{usuario.nombre}</b><span>{usuario.rol}</span>
        <button onClick={salir}><LogOut size={17}/>Salir</button>
      </div>
    </aside>
    <main>{children}</main>
  </div>
}