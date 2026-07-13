import { useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Mensaje,Titulo } from '../../Componentes/Comun'
import { UsarSesion } from '../../Contextos/Sesion'
import { Solicitar } from '../../Servicios/Api'
import { ClaveValida } from '../../Validaciones/Reglas'

export function Configuracion() {
  const { usuario,actualizarUsuario }=UsarSesion()
  const [formulario,setFormulario]=useState({claveactual:'',clavenueva:'',confirmacion:''})
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const guardar=async evento=>{
    evento.preventDefault();setError('');setCorrecto('')
    if (!ClaveValida(formulario.clavenueva)) return setError('La nueva contraseña no cumple los requisitos')
    if (formulario.clavenueva!==formulario.confirmacion) return setError('Las contraseñas no coinciden')
    try {
      const respuesta=await Solicitar('/cambiarclave',{method:'POST',body:JSON.stringify({claveactual:formulario.claveactual,clavenueva:formulario.clavenueva})})
      actualizarUsuario(respuesta.usuario);setFormulario({claveactual:'',clavenueva:'',confirmacion:''});setCorrecto('Contraseña actualizada y sesiones anteriores revocadas')
    } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina estrecho">
    <Titulo titulo="Configuración" descripcion="Seguridad de la cuenta"/>
    <Mensaje error={error} correcto={correcto}/>
    {usuario.debecambiarclave&&<div className="bloque advertenciabloque">Debe cambiar su contraseña antes de usar el resto del sistema.</div>}
    <div className="panel"><h2>Cambiar contraseña</h2><form onSubmit={guardar}>
      <Campo etiqueta="Contraseña actual" type="password" value={formulario.claveactual} onChange={e=>setFormulario({...formulario,claveactual:e.target.value.slice(0,128)})} required/>
      <Campo etiqueta="Nueva contraseña" type="password" value={formulario.clavenueva} onChange={e=>setFormulario({...formulario,clavenueva:e.target.value.slice(0,128)})} minLength="12" required/>
      <Campo etiqueta="Confirmar nueva contraseña" type="password" value={formulario.confirmacion} onChange={e=>setFormulario({...formulario,confirmacion:e.target.value.slice(0,128)})} minLength="12" required/>
      <p className="ayuda">Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.</p>
      <button className="principal">Actualizar contraseña</button>
    </form></div>
  </div>
}