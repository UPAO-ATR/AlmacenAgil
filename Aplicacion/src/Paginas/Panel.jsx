import { useState } from 'react'
import { Marco } from '../Componentes/Marco'
import { UsarSesion } from '../Contextos/Sesion'
import { Resumen } from './Panel/Resumen'
import { Inventario } from './Panel/Inventario'
import { Cotizaciones } from './Panel/Cotizaciones'
import { Proveedores } from './Panel/Proveedores'
import { Usuarios } from './Panel/Usuarios'
import { Reabastecimientos } from './Panel/Reabastecimientos'
import { Recepciones } from './Panel/Recepciones'
import { Auditorias } from './Panel/Auditorias'
import { Notificaciones } from './Panel/Notificaciones'
import { Configuracion } from './Panel/Configuracion'
import { Trazabilidad } from './Panel/Trazabilidad'

export function Panel() {
  const { usuario }=UsarSesion()
  const [pagina,setPagina]=useState(usuario.debecambiarclave?'configuracion':'resumen')
  const paginas={resumen:Resumen,inventario:Inventario,cotizaciones:Cotizaciones,proveedores:Proveedores,usuarios:Usuarios,reabastecimientos:Reabastecimientos,recepciones:Recepciones,auditorias:Auditorias,notificaciones:Notificaciones,configuracion:Configuracion,trazabilidad:Trazabilidad}
  const Pagina=paginas[pagina]||Resumen
  return <Marco pagina={pagina} setPagina={setPagina}><Pagina setPagina={setPagina}/></Marco>
}