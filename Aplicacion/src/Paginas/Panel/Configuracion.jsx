import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Mensaje,Titulo } from '../../Componentes/Comun'
import { UsarSesion } from '../../Contextos/Sesion'
import { Solicitar } from '../../Servicios/Api'
import { ClaveValida } from '../../Validaciones/Reglas'

const EmpresaVacia={nombrecomercial:'',razonsocial:'',ruc:'',direccion:'',telefono:'',correo:'',serie:'FI01'}

export function Configuracion() {
  const { usuario,actualizarUsuario }=UsarSesion()
  const [formulario,setFormulario]=useState({claveactual:'',clavenueva:'',confirmacion:''})
  const [empresa,setEmpresa]=useState(EmpresaVacia)
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  useEffect(()=>{
    if (usuario.rol==='Administrador') Solicitar('/empresa').then(datos=>setEmpresa(Object.fromEntries(Object.keys(EmpresaVacia).map(clave=>[clave,String(datos[clave]??'')])))).catch(fallo=>setError(fallo.message))
  },[usuario.rol])

  const guardar=async evento=>{
    evento.preventDefault();setError('');setCorrecto('')
    if (!ClaveValida(formulario.clavenueva)) return setError('La nueva contraseña no cumple los requisitos')
    if (formulario.claveactual===formulario.clavenueva) return setError('La nueva contraseña debe ser distinta')
    if (formulario.clavenueva!==formulario.confirmacion) return setError('Las contraseñas no coinciden')
    try {
      const respuesta=await Solicitar('/cambiarclave',{method:'POST',body:JSON.stringify({claveactual:formulario.claveactual,clavenueva:formulario.clavenueva})})
      actualizarUsuario(respuesta.usuario);setFormulario({claveactual:'',clavenueva:'',confirmacion:''});setCorrecto('Contraseña actualizada y sesiones anteriores revocadas')
    } catch (fallo) { setError(fallo.message) }
  }

  const guardarEmpresa=async evento=>{
    evento.preventDefault();setError('');setCorrecto('')
    try {
      const respuesta=await Solicitar('/empresa',{method:'PUT',body:JSON.stringify(empresa)})
      setEmpresa(Object.fromEntries(Object.keys(EmpresaVacia).map(clave=>[clave,String(respuesta[clave]??'')])));setCorrecto('Datos de emisión actualizados')
    } catch (fallo) { setError(fallo.message) }
  }

  return <div className="pagina estrecho">
    <Titulo titulo="Configuración" descripcion="Seguridad de la cuenta y datos de emisión"/>
    <Mensaje error={error} correcto={correcto}/>
    {usuario.debecambiarclave&&<div className="bloque advertenciabloque">Debe cambiar su contraseña antes de usar el resto del sistema.</div>}
    <div className="panel"><h2>Cambiar contraseña</h2><form onSubmit={guardar}>
      <Campo etiqueta="Contraseña actual" type="password" value={formulario.claveactual} onChange={e=>setFormulario({...formulario,claveactual:e.target.value.slice(0,128)})} required/>
      <Campo etiqueta="Nueva contraseña" type="password" value={formulario.clavenueva} onChange={e=>setFormulario({...formulario,clavenueva:e.target.value.slice(0,128)})} minLength="12" maxLength="128" required/>
      <Campo etiqueta="Confirmar nueva contraseña" type="password" value={formulario.confirmacion} onChange={e=>setFormulario({...formulario,confirmacion:e.target.value.slice(0,128)})} minLength="12" maxLength="128" required/>
      <p className="ayuda">Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.</p>
      <button className="principal">Actualizar contraseña</button>
    </form></div>
    {usuario.rol==='Administrador'&&<div className="panel seccionsecundaria"><h2>Datos de la factura interna</h2><form onSubmit={guardarEmpresa}>
      <Campo etiqueta="Nombre comercial" value={empresa.nombrecomercial} onChange={e=>setEmpresa({...empresa,nombrecomercial:e.target.value.slice(0,120)})} minLength="2" maxLength="120" required/>
      <Campo etiqueta="Razón social" value={empresa.razonsocial} onChange={e=>setEmpresa({...empresa,razonsocial:e.target.value.slice(0,160)})} minLength="2" maxLength="160" required/>
      <Campo etiqueta="RUC" inputMode="numeric" pattern="[0-9]{11}" value={empresa.ruc} onChange={e=>setEmpresa({...empresa,ruc:e.target.value.replace(/\D/g,'').slice(0,11)})} required/>
      <Campo etiqueta="Dirección" value={empresa.direccion} onChange={e=>setEmpresa({...empresa,direccion:e.target.value.slice(0,220)})} minLength="3" maxLength="220" required/>
      <Campo etiqueta="Teléfono" inputMode="tel" pattern="[+]?[0-9]{7,15}" value={empresa.telefono} onChange={e=>setEmpresa({...empresa,telefono:e.target.value.replace(/[^+0-9]/g,'').slice(0,15)})} required/>
      <Campo etiqueta="Correo" type="email" value={empresa.correo} onChange={e=>setEmpresa({...empresa,correo:e.target.value.slice(0,160)})} maxLength="160" required/>
      <Campo etiqueta="Serie interna" pattern="[A-Z0-9]{4}" value={empresa.serie} onChange={e=>setEmpresa({...empresa,serie:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)})} minLength="4" maxLength="4" required/>
      <div className="panelinformativo"><b>Documento interno</b><span>La factura generada incluye código, QR y huella de verificación, pero no reemplaza un comprobante electrónico SUNAT.</span></div>
      <button className="principal">Guardar datos de emisión</button>
    </form></div>}
  </div>
}