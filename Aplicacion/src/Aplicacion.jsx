import { useState } from 'react'
import { UsarSesion } from './Contextos/Sesion'
import { Acceso } from './Paginas/Acceso'
import { Catalogo } from './Paginas/Catalogo'
import { Panel } from './Paginas/Panel'
export function Aplicacion(){const {usuario,cargando}=UsarSesion();const [portal]=useState(new URLSearchParams(location.search).has('portal'));if(cargando)return <div className="cargando">Cargando...</div>;if(!portal&&!usuario)return <Catalogo/>;if(!usuario)return <Acceso/>;return <Panel/>}