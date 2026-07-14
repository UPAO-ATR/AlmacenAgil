import { useEffect,useState } from 'react'
import { Campo } from '../../Componentes/Campo'
import { Estado,FormatoFecha,Mensaje,Modal,Titulo } from '../../Componentes/Comun'
import { Solicitar } from '../../Servicios/Api'

const Vacio={nombres:'',apellidos:'',dni:'',correo:'',rol:'AsesorVentas'}

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

  const guardar=async evento=>{
    evento.preventDefault();setError('');setCredenciales(null)
    try {
      const respuesta=await Solicitar('/usuarios',{method:'POST',body:JSON.stringify(formulario)})
      setModal(false);setFormulario(Vacio);setCorrecto(`Usuario creado. ${mensajeCorreo(respuesta.correoestado)}`);setCredenciales(respuesta.credenciales||null);await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const cambiarEstado=async usuario=>{
    try { await Solicitar(`/usuarios/${usuario.id}/estado`,{method:'PATCH'});await cargar() } catch (fallo) { setError(fallo.message) }
  }

  const desbloquear=async usuario=>{
    try { await Solicitar(`/usuarios/${usuario.id}/desbloquear`,{method:'PATCH'});await cargar() } catch (fallo) { setError(fallo.message) }
  }

  const generar=async usuario=>{
    try {
      const respuesta=await Solicitar(`/usuarios/${usuario.id}/reenviar`,{method:'POST'})
      setCorrecto(`Credenciales renovadas. ${mensajeCorreo(respuesta.correoestado)}`);setCredenciales(respuesta.credenciales||null)
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

  return <div className="pagina">
    <Titulo titulo="Trabajadores" descripcion="Creación, activación, roles y bloqueo inmediato" accion={<button className="principal" onClick={()=>setModal(true)}>Nuevo trabajador</button>}/>
    <Mensaje error={error} correcto={correcto}/>
    <div className="tabla"><table>
      <thead><tr><th>Trabajador</th><th>DNI</th><th>Correo</th><th>Rol</th><th>Correo verificado</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
      <tbody>{usuarios.map(usuario=><tr key={usuario.id}>
        <td><b>{usuario.nombres} {usuario.apellidos}</b>{usuario.esrespaldo&&<small>Cuenta de recuperación</small>}</td><td>{usuario.dni}</td><td>{usuario.correo}</td><td>{usuario.rol}</td>
        <td><Estado valor={usuario.correoverificado?'Activo':'Pendiente'}/></td><td><Estado valor={usuario.activo?'Activo':'Bloqueado'}/></td><td><FormatoFecha valor={usuario.creadoen}/></td>
        <td className="accionesfila">{usuario.esrespaldo?<button className="secundario" disabled>Protegida</button>:<button className="secundario peligrotexto" onClick={()=>cambiarEstado(usuario)}>{usuario.activo?'Bloquear':'Activar'}</button>}{usuario.bloqueadohasta&&<button className="secundario" onClick={()=>desbloquear(usuario)}>Desbloquear acceso</button>}{!usuario.correoverificado&&usuario.activo&&<button className="secundario" onClick={()=>generar(usuario)}>Generar credenciales</button>}</td>
      </tr>)}</tbody>
    </table></div>
    {modal&&<Modal titulo="Nuevo trabajador" cerrar={()=>setModal(false)}><form onSubmit={guardar}>
      <Campo etiqueta="Nombres" value={formulario.nombres} onChange={e=>setFormulario({...formulario,nombres:e.target.value.slice(0,80)})} minLength="2" required/>
      <Campo etiqueta="Apellidos" value={formulario.apellidos} onChange={e=>setFormulario({...formulario,apellidos:e.target.value.slice(0,80)})} minLength="2" required/>
      <Campo etiqueta="DNI" inputMode="numeric" pattern="[0-9]{8}" value={formulario.dni} onChange={e=>setFormulario({...formulario,dni:e.target.value.replace(/\D/g,'').slice(0,8)})} required/>
      <Campo etiqueta="Correo" type="email" value={formulario.correo} onChange={e=>setFormulario({...formulario,correo:e.target.value.slice(0,160)})} required/>
      <label className="campo"><span>Rol</span><select value={formulario.rol} onChange={e=>setFormulario({...formulario,rol:e.target.value})}><option value="AsesorVentas">Asesor de ventas</option><option value="JefeAlmacen">Jefe de almacén</option><option value="Administrador">Administrador</option></select></label>
      <button className="principal">Crear trabajador</button>
    </form></Modal>}
    {credenciales&&<Modal titulo="Credenciales de activación" cerrar={()=>setCredenciales(null)}><div className="credencialesmodal">
      <p>Entréguelas al trabajador una sola vez. Al activar la cuenta deberá establecer su contraseña definitiva.</p>
      <div><span>Correo</span><code>{credenciales.correo}</code><button className="secundario" type="button" onClick={()=>copiar(credenciales.correo)}>Copiar</button></div>
      <div><span>Código</span><code>{credenciales.codigo}</code><button className="secundario" type="button" onClick={()=>copiar(credenciales.codigo)}>Copiar</button></div>
      <div><span>Clave temporal</span><code>{credenciales.clavetemporal}</code><button className="secundario" type="button" onClick={()=>copiar(credenciales.clavetemporal)}>Copiar</button></div>
      <small>Vence: <FormatoFecha valor={credenciales.venceen}/></small>
      <button className="principal" type="button" onClick={()=>setCredenciales(null)}>Entendido</button>
    </div></Modal>}
  </div>
}