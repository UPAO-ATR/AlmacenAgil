import { X } from 'lucide-react'

export function Titulo({titulo,descripcion,accion}) {
  return <div className="cabecera">
    <div><h1>{titulo}</h1><p>{descripcion}</p></div>
    {accion}
  </div>
}

export function Modal({titulo,cerrar,children,ancho=false}) {
  return <div className="modal" role="dialog" aria-modal="true">
    <div className={`formulariomodal ${ancho?'modalancho':''}`.trim()}>
      <button type="button" className="cerrar" onClick={cerrar} aria-label="Cerrar"><X/></button>
      <h2>{titulo}</h2>
      {children}
    </div>
  </div>
}

export function Mensaje({error,correcto}) {
  if (error) return <div className="mensajeerror bloque">{error}</div>
  if (correcto) return <div className="mensajecorrecto bloque">{correcto}</div>
  return null
}

export function Estado({valor}) {
  const favorables=['Normal','EnPreparacion','ListaRecojo','Entregada','Recibido','Enviado','Activo','PagoVerificado']
  const clase=favorables.includes(valor)?'correcto':['Rechazada','PagoRechazado','Error','Agotado','Bloqueado'].includes(valor)?'peligro':'advertencia'
  return <span className={`estado ${clase}`}>{String(valor).replace(/([a-z])([A-Z])/g,'$1 $2')}</span>
}

export function FormatoFecha({valor}) {
  return valor?new Date(valor).toLocaleString('es-PE'):'—'
}