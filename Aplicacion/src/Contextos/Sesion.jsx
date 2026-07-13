import { createContext,useContext,useEffect,useState } from 'react'
import { DefinirProteccion,Solicitar } from '../Servicios/Api'

const ContextoSesion=createContext(null)

export function ProveedorSesion({children}) {
  const [usuario,setUsuario]=useState(null)
  const [cargando,setCargando]=useState(true)

  useEffect(()=>{
    Solicitar('/sesion').then(respuesta=>{
      DefinirProteccion(respuesta.usuario.proteccion)
      setUsuario(respuesta.usuario)
    }).catch(()=>DefinirProteccion('')).finally(()=>setCargando(false))
  },[])

  const acceder=async(correo,clave)=>{
    const respuesta=await Solicitar('/acceso',{method:'POST',body:JSON.stringify({correo,clave})})
    DefinirProteccion(respuesta.usuario.proteccion)
    setUsuario(respuesta.usuario)
  }

  const salir=async()=>{
    await Solicitar('/salir',{method:'POST'})
    DefinirProteccion('')
    setUsuario(null)
  }

  const actualizarUsuario=usuarioNuevo=>{
    DefinirProteccion(usuarioNuevo.proteccion)
    setUsuario(usuarioNuevo)
  }

  return <ContextoSesion.Provider value={{usuario,cargando,acceder,salir,actualizarUsuario}}>{children}</ContextoSesion.Provider>
}

export const UsarSesion=()=>useContext(ContextoSesion)