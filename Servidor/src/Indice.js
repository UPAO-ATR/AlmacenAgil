import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { Api } from './Rutas/Api.js'
import { BaseDatos } from './BaseDatos.js'
import { ValidarConfiguracion } from './Configuracion.js'
import { PrepararAlertasIniciales,PrepararEsquema,PrepararUsuariosIniciales } from './Inicializacion.js'
import { ExigirJson,LimiteGeneral,VerificarOrigen } from './Intermediarios/Seguridad.js'

const Aplicacion=express()

Aplicacion.disable('x-powered-by')
Aplicacion.set('trust proxy',1)
Aplicacion.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}))
Aplicacion.use(LimiteGeneral)
Aplicacion.use(VerificarOrigen)
Aplicacion.use(ExigirJson)
Aplicacion.use(express.json({limit:'2mb',strict:true,type:'application/json'}))
Aplicacion.use(cookieParser())
Aplicacion.use((_,res,siguiente)=>{res.set('Cache-Control','no-store');siguiente()})
Aplicacion.use('/api',Api)
Aplicacion.use((_,res)=>res.status(404).json({mensaje:'Ruta no encontrada'}))
Aplicacion.use((error,_,res,__)=>{
  if (error?.type==='entity.parse.failed') return res.status(400).json({mensaje:'JSON inválido'})
  if (error?.type==='entity.too.large'||error?.status===413) return res.status(413).json({mensaje:'Solicitud demasiado grande'})
  if (error?.code==='23505') return res.status(409).json({mensaje:'Registro duplicado'})
  if (['23503','22P02','23514','23502'].includes(error?.code)) return res.status(400).json({mensaje:'Datos no permitidos'})
  console.error('Error interno',error?.message)
  res.status(500).json({mensaje:'Error interno'})
})

async function Iniciar() {
  ValidarConfiguracion()
  await PrepararEsquema()
  await PrepararUsuariosIniciales()
  await PrepararAlertasIniciales()
  const puerto=Number(process.env.PUERTO||3000)
  const servidor=Aplicacion.listen(puerto,'0.0.0.0',()=>console.log('Servidor operativo'))
  const cerrar=async()=>{
    servidor.close(async()=>{
      await BaseDatos.end()
      process.exit(0)
    })
  }
  process.on('SIGTERM',cerrar)
  process.on('SIGINT',cerrar)
}

Iniciar().catch(error=>{
  console.error('No se pudo iniciar',error.message)
  process.exit(1)
})