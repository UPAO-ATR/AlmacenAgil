import nodemailer from 'nodemailer'
import { BaseDatos } from '../BaseDatos.js'

let Transporte

function ObtenerTransporte() {
  if (Transporte!==undefined) return Transporte
  if (!process.env.SERVIDORCORREO) {
    Transporte = null
    return Transporte
  }
  Transporte = nodemailer.createTransport({
    host:process.env.SERVIDORCORREO,
    port:Number(process.env.PUERTOCORREO||587),
    secure:String(process.env.CORREOSEGURIDAD||'false')==='true',
    auth:process.env.USUARIOCORREO?{user:process.env.USUARIOCORREO,pass:process.env.CLAVECORREO}:undefined,
    connectionTimeout:8000,
    greetingTimeout:8000,
    socketTimeout:12000
  })
  return Transporte
}

export async function EnviarCorreo(tipo,destinatario,asunto,cuerpo,adjunto,cuerporegistro=cuerpo) {
  const transporte = ObtenerTransporte()
  let estado='Pendiente'
  let error=null
  let enviadoen=null
  if (transporte) {
    try {
      await transporte.sendMail({
        from:process.env.REMITENTECORREO||'Almacén Ágil <noresponder@almacenagil.local>',
        to:destinatario,
        subject:asunto,
        text:cuerpo,
        attachments:adjunto?[{filename:adjunto.nombre,content:adjunto.contenido,contentType:adjunto.tipo}]:[]
      })
      estado='Enviado'
      enviadoen=new Date()
    } catch (fallo) {
      estado='Error'
      error=String(fallo.message||'No se pudo enviar').slice(0,500)
    }
  }
  const registro = (await BaseDatos.query(
    `INSERT INTO notificaciones(tipo,destinatario,asunto,cuerpo,estado,error,enviadoen)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [tipo,destinatario,asunto,cuerporegistro,estado,error,enviadoen]
  )).rows[0]
  return registro
}