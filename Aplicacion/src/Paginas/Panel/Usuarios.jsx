import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Estado,FormatoFecha,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'
import { CorreoValido,NombrePersona } from '../../Validaciones/Reglas'

const Vacio={nombres:'',apellidos:'',dni:'',correo:'',rol:'AsesorVentas'}
const Roles=['Administrador','AsesorVentas','JefeAlmacen']

const Bloqueado=usuario=>Boolean(usuario.bloqueadohasta&&new Date(usuario.bloqueadohasta)>new Date())

function EstadoCuenta(usuario) {
  if (!usuario.activo) return 'Desactivado'
  if (Bloqueado(usuario)) return 'Bloqueado'
  if (!usuario.correoverificado) return 'Pendiente'
  if (usuario.debecambiarclave) return 'Cambio pendiente'
  return 'Activo'
}

function VerificacionCuenta(usuario) {
  if (!usuario.correoverificado) return 'Pendiente'
  if (usuario.metodoactivacion==='Administrador') return 'Administrador'
  if (usuario.metodoactivacion==='Codigo') return 'Código'
  if (usuario.metodoactivacion==='Inicial') return 'Inicial'
  return 'Activa'
}

export function Usuarios() {
  const [usuarios,setUsuarios]=useState([])
  const [formulario,setFormulario]=useState(Vacio)
  const [modal,setModal]=useState(false)
  const [credenciales,setCredenciales]=useState(null)
  const [error,setError]=useState('')
  const [correcto,setCorrecto]=useState('')

  const cargar=async()=>{try{setUsuarios(await Solicitar('/usuarios'))}catch(fallo){setError(fallo.message)}}
  useEffect(()=>{cargar()},[])

  const mensajeCorreo=estado=>estado==='Enviado'
    ? 'Las credenciales fueron enviadas por correo.'
    : estado==='Error'
      ? 'El correo falló. Entregue las credenciales mostradas al trabajador.'
      : 'El correo no está configurado. Entregue las credenciales mostradas al trabajador.'

  const validarFormulario=()=>{
    if (formulario.nombres.trim().length<2||formulario.apellidos.trim().length<2) return 'Revise nombres y apellidos'
    if (!/^\d{8}$/.test(formulario.dni)) return 'El DNI debe tener 8 dígitos'
    if (!CorreoValido(formulario.correo)) return 'Ingrese un correo válido'
    if (!Roles.includes(formulario.rol)) return 'Seleccione un rol válido'
    return ''
  }

  const guardar=async evento=>{
    evento.preventDefault();setError('');setCorrecto('');setCredenciales(null)
    const validacion=validarFormulario()
    if (validacion) return setError(validacion)
    try {
      const datos={...formulario,nombres:formulario.nombres.trim(),apellidos:formulario.apellidos.trim(),correo:formulario.correo.trim().toLowerCase()}
      const respuesta=await Solicitar('/usuarios',{method:'POST',body:JSON.stringify(datos)})
      setModal(false);setFormulario(Vacio);setCorrecto(`Trabajador creado. ${mensajeCorreo(respuesta.correoestado)}`);setCredenciales(respuesta.credenciales||null);await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const confirmar=mensaje=>window.confirm(mensaje)

  const activarManual=async usuario=>{
    const renovar=usuario.correoverificado&&usuario.debecambiarclave
    const mensaje=renovar
      ? `Se invalidará la clave temporal anterior de ${usuario.nombres} ${usuario.apellidos}. ¿Desea generar una nueva?`
      : `Se activará manualmente a ${usuario.nombres} ${usuario.apellidos}. ¿Desea continuar?`
    if (!confirmar(mensaje)) return
    setError('');setCorrecto('');setCredenciales(null)
    try {
      const respuesta=await Solicitar(`/usuarios/${usuario.id}/activar-manual`,{method:'POST',body:JSON.stringify({confirmacion:true})})
      setCredenciales(respuesta.credenciales)
      setCorrecto(renovar?'Clave temporal renovada':'Trabajador activado manualmente')
      await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const desactivar=async usuario=>{
    if (!confirmar(`Se cerrarán las sesiones y se desactivará a ${usuario.nombres} ${usuario.apellidos}. ¿Desea continuar?`)) return
    setError('');setCorrecto('')
    try {
      await Solicitar(`/usuarios/${usuario.id}/desactivar`,{method:'PATCH',body:JSON.stringify({confirmacion:true})})
      setCorrecto('Trabajador desactivado')
      await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const reactivar=async usuario=>{
    if (!confirmar(`Se reactivará a ${usuario.nombres} ${usuario.apellidos} con una nueva clave temporal. ¿Desea continuar?`)) return
    setError('');setCorrecto('');setCredenciales(null)
    try {
      const respuesta=await Solicitar(`/usuarios/${usuario.id}/reactivar`,{method:'POST',body:JSON.stringify({confirmacion:true})})
      setCredenciales(respuesta.credenciales)
      setCorrecto('Trabajador reactivado')
      await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const desbloquear=async usuario=>{
    if (!confirmar(`¿Desbloquear el acceso de ${usuario.nombres} ${usuario.apellidos}?`)) return
    setError('');setCorrecto('')
    try {
      await Solicitar(`/usuarios/${usuario.id}/desbloquear`,{method:'PATCH',body:JSON.stringify({confirmacion:true})})
      setCorrecto('Acceso desbloqueado')
      await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const generar=async usuario=>{
    if (!confirmar(`Se invalidarán el código y la clave anteriores de ${usuario.nombres} ${usuario.apellidos}. ¿Desea continuar?`)) return
    setError('');setCorrecto('');setCredenciales(null)
    try {
      const respuesta=await Solicitar(`/usuarios/${usuario.id}/reenviar`,{method:'POST',body:JSON.stringify({confirmacion:true})})
      setCorrecto(`Credenciales renovadas. ${mensajeCorreo(respuesta.correoestado)}`);setCredenciales(respuesta.credenciales||null);await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const copiar=async texto=>{
    try {
      await navigator.clipboard.writeText(texto)
      setCorrecto('Dato copiado')
    } catch {
      setError('No se pudo copiar automáticamente')
    }
  }

  const acciones=usuario=>{
    if (usuario.esrespaldo) return <button className="secundario" disabled>Protegida</button>
    if (!usuario.activo) return <button className="secundario" onClick={()=>reactivar(usuario)}>Reactivar</button>
    return <>
      {Bloqueado(usuario)&&<button className="secundario" onClick={()=>desbloquear(usuario)}>Desbloquear</button>}
      {!usuario.correoverificado&&<button className="secundario" onClick={()=>activarManual(usuario)}>Activar manualmente</button>}
      {!usuario.correoverificado&&<button className="secundario" onClick={()=>generar(usuario)}>Generar credenciales</button>}
      {usuario.correoverificado&&usuario.debecambiarclave&&<button className="secundario" onClick={()=>activarManual(usuario)}>Renovar clave temporal</button>}
      <button className="secundario peligrotexto" onClick={()=>desactivar(usuario)}>Desactivar</button>
    </>
  }

  return <div className="pagina">
    <Titulo titulo="Trabajadores" descripcion="Creación, activación manual, roles y control de acceso" accion={<button className="principal" onClick={()=>{setModal(true);setError('');setCorrecto('')}}>Nuevo trabajador</button>}/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tabla"><table>
      <thead><tr><th>Trabajador</th><th>DNI</th><th>Correo</th><th>Rol</th><th>Verificación</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
      <tbody>{usuarios.map(usuario=><tr key={usuario.id}>
        <td><b>{usuario.nombres} {usuario.apellidos}</b>{usuario.esrespaldo&&<small>Cuenta de recuperación</small>}{usuario.debecambiarclave&&usuario.correoverificado&&<small>Cambio de contraseña obligatorio</small>}</td>
        <td>{usuario.dni}</td><td>{usuario.correo}</td><td>{usuario.rol}</td>
        <td><Estado valor={VerificacionCuenta(usuario)}/></td><td><Estado valor={EstadoCuenta(usuario)}/>{Bloqueado(usuario)&&<small>Hasta <FormatoFecha valor={usuario.bloqueadohasta}/></small>}</td><td><FormatoFecha valor={usuario.creadoen}/></td>
        <td><div className="accionesfila vertical">{acciones(usuario)}</div></td>
      </tr>)}</tbody>
    </table></div>
    {modal&&<Modal titulo="Nuevo trabajador" cerrar={()=>setModal(false)}><form onSubmit={guardar} noValidate>
      <Campo etiqueta="DNI" inputMode="numeric" pattern="[0-9]{8}" maxLength="8" value={formulario.dni} onChange={e=>setFormulario({...formulario,dni:e.target.value.replace(/\D/g,'').slice(0,8)})} required/>
      <Campo etiqueta="Apellidos" value={formulario.apellidos} onChange={e=>setFormulario({...formulario,apellidos:NombrePersona(e.target.value,80)})} minLength="2" maxLength="80" required/>
      <Campo etiqueta="Nombres" value={formulario.nombres} onChange={e=>setFormulario({...formulario,nombres:NombrePersona(e.target.value,80)})} minLength="2" maxLength="80" required/>
      <label className="campo"><span>Rol</span><select value={formulario.rol} onChange={e=>setFormulario({...formulario,rol:e.target.value})} required><option value="AsesorVentas">Asesor de ventas</option><option value="JefeAlmacen">Jefe de almacén</option><option value="Administrador">Administrador</option></select></label>
      <Campo etiqueta="Correo" type="email" maxLength="160" value={formulario.correo} onChange={e=>setFormulario({...formulario,correo:e.target.value.replace(/\s/g,'').slice(0,160)})} required/>
      <button className="principal">Crear trabajador</button>
    </form></Modal>}
    {credenciales&&<Modal titulo={credenciales.ingresotemporal?'Acceso temporal':'Credenciales de activación'} cerrar={()=>setCredenciales(null)}><div className="credencialesmodal">
      <p>{credenciales.ingresotemporal?'El trabajador debe ingresar con esta clave temporal y cambiarla obligatoriamente antes de usar el sistema.':'Entregue estos datos una sola vez. El trabajador deberá activar la cuenta y establecer su contraseña definitiva.'}</p>
      <div><span>Correo</span><code>{credenciales.correo}</code><button className="secundario" type="button" onClick={()=>copiar(credenciales.correo)}>Copiar</button></div>
      {credenciales.codigo&&<div><span>Código</span><code>{credenciales.codigo}</code><button className="secundario" type="button" onClick={()=>copiar(credenciales.codigo)}>Copiar</button></div>}
      <div><span>Clave temporal</span><code>{credenciales.clavetemporal}</code><button className="secundario" type="button" onClick={()=>copiar(credenciales.clavetemporal)}>Copiar</button></div>
      <small>Vence: <FormatoFecha valor={credenciales.venceen}/></small>
      <button className="principal" type="button" onClick={()=>setCredenciales(null)}>Entendido</button>
    </div></Modal>}
  </div>
}