import { useState } from 'react'
import { UsarSesion } from '../Contextos/Sesion'
import { Campo } from '../Componentes/Campo'
import { Solicitar } from '../Servicios/Api'
import { ClaveValida,CorreoValido } from '../Validaciones/Reglas'

export function Acceso() {
  const { acceder }=UsarSesion()
  const [modo,setModo]=useState('acceso')
  const [correo,setCorreo]=useState('')
  const [clave,setClave]=useState('')
  const [activacion,setActivacion]=useState({correo:'',codigo:'',clavetemporal:'',clavenueva:''})
  const [error,setError]=useState('')
  const [mensaje,setMensaje]=useState('')
  const [enviando,setEnviando]=useState(false)

  const ingresar=async evento=>{
    evento.preventDefault()
    setError('')
    if (!CorreoValido(correo)||clave.length<8) return setError('Revise sus credenciales')
    try {
      setEnviando(true)
      await acceder(correo,clave)
    } catch (fallo) {
      setError(fallo.message)
    } finally { setEnviando(false) }
  }

  const activar=async evento=>{
    evento.preventDefault()
    setError('')
    setMensaje('')
    if (!CorreoValido(activacion.correo)||!/^[0-9]{6}$/.test(activacion.codigo)||!ClaveValida(activacion.clavenueva)) {
      return setError('Revise los datos de activación')
    }
    try {
      setEnviando(true)
      const respuesta=await Solicitar('/activarcuenta',{method:'POST',body:JSON.stringify(activacion)})
      setMensaje(respuesta.mensaje)
      setCorreo(activacion.correo)
      setModo('acceso')
    } catch (fallo) {
      setError(fallo.message)
    } finally { setEnviando(false) }
  }

  return <div className="fondologin">
    <div className="tarjetalogin">
      <div className="logotipo"><img src="/icono-blanco.png" alt="ELIM-Almacén"/></div>
      <div className="pestanas">
        <button type="button" className={modo==='acceso'?'activo':''} onClick={()=>{setModo('acceso');setError('')}}>Ingresar</button>
        <button type="button" className={modo==='activar'?'activo':''} onClick={()=>{setModo('activar');setError('')}}>Activar cuenta</button>
      </div>
      {modo==='acceso'?<form onSubmit={ingresar}>
        <h1>Iniciar sesión</h1>
        <p>Ingresa tus credenciales para continuar</p>
        <Campo etiqueta="Correo" type="email" value={correo} onChange={evento=>setCorreo(evento.target.value.slice(0,160))} autoComplete="username" maxLength="160" required/>
        <Campo etiqueta="Contraseña" type="password" value={clave} onChange={evento=>setClave(evento.target.value.slice(0,128))} autoComplete="current-password" minLength="8" maxLength="128" required/>
        {mensaje&&<div className="mensajecorrecto">{mensaje}</div>}
        {error&&<div className="mensajeerror">{error}</div>}
        <button className="principal" disabled={enviando}>{enviando?'Ingresando...':'Ingresar'}</button>
      </form>:<form onSubmit={activar}>
        <h1>Activar cuenta</h1>
        <p>Usa el código y la clave temporal enviados por correo o entregados por un administrador.</p>
        <Campo etiqueta="Correo" type="email" value={activacion.correo} onChange={evento=>setActivacion({...activacion,correo:evento.target.value.slice(0,160)})} required/>
        <Campo etiqueta="Código de 6 dígitos" inputMode="numeric" pattern="[0-9]{6}" value={activacion.codigo} onChange={evento=>setActivacion({...activacion,codigo:evento.target.value.replace(/\D/g,'').slice(0,6)})} required/>
        <Campo etiqueta="Contraseña temporal" type="password" value={activacion.clavetemporal} onChange={evento=>setActivacion({...activacion,clavetemporal:evento.target.value.slice(0,128)})} required/>
        <Campo etiqueta="Nueva contraseña" type="password" value={activacion.clavenueva} onChange={evento=>setActivacion({...activacion,clavenueva:evento.target.value.slice(0,128)})} minLength="12" required/>
        <small className="ayuda">Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.</small>
        {error&&<div className="mensajeerror">{error}</div>}
        <button className="principal" disabled={enviando}>{enviando?'Activando...':'Activar cuenta'}</button>
      </form>}
    </div>
  </div>
}