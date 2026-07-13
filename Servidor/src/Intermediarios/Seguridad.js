import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { BaseDatos } from '../BaseDatos.js'

export const LimiteGeneral = rateLimit({
  windowMs:60_000,
  limit:120,
  standardHeaders:true,
  legacyHeaders:false,
  message:{mensaje:'Demasiadas solicitudes'}
})

export const LimiteAcceso = rateLimit({
  windowMs:15*60_000,
  limit:8,
  skipSuccessfulRequests:true,
  standardHeaders:true,
  legacyHeaders:false,
  message:{mensaje:'Acceso temporalmente bloqueado'}
})

export const LimiteCotizacion = rateLimit({
  windowMs:10*60_000,
  limit:20,
  standardHeaders:true,
  legacyHeaders:false,
  message:{mensaje:'Límite de cotizaciones alcanzado'}
})

export const LimiteActivacion = rateLimit({
  windowMs:15*60_000,
  limit:10,
  standardHeaders:true,
  legacyHeaders:false,
  message:{mensaje:'Demasiados intentos de activación'}
})

export async function Autenticar(req,res,siguiente) {
  const token=req.cookies?.SesionSegura
  if (!token) return res.status(401).json({mensaje:'Sesión requerida'})
  try {
    const datos=jwt.verify(token,process.env.SECRETOACCESO,{
      algorithms:['HS256'],
      issuer:'AlmacenAgil',
      audience:'AplicacionAlmacen'
    })
    const usuario=(await BaseDatos.query(
      `SELECT id,nombres,apellidos,correo,rol,activo,correoverificado,debecambiarclave,versionsesion
       FROM usuarios WHERE id=$1 LIMIT 1`,
      [datos.id]
    )).rows[0]
    if (!usuario||!usuario.activo||!usuario.correoverificado||Number(usuario.versionsesion)!==Number(datos.version)) {
      return res.status(401).json({mensaje:'Sesión revocada'})
    }
    req.usuario={
      id:usuario.id,
      nombre:`${usuario.nombres} ${usuario.apellidos}`,
      correo:usuario.correo,
      rol:usuario.rol,
      debecambiarclave:usuario.debecambiarclave,
      proteccion:datos.proteccion
    }
    siguiente()
  } catch {
    return res.status(401).json({mensaje:'Sesión inválida'})
  }
}

export function Autorizar(...roles) {
  return (req,res,siguiente)=>roles.includes(req.usuario?.rol)
    ? siguiente()
    : res.status(403).json({mensaje:'Acceso denegado'})
}

export function ExigirProteccion(req,res,siguiente) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return siguiente()
  const recibido=req.get('X-Proteccion')||''
  const esperado=req.usuario?.proteccion||''
  const a=Buffer.from(recibido)
  const b=Buffer.from(esperado)
  if (!a.length||a.length!==b.length||!crypto.timingSafeEqual(a,b)) {
    return res.status(403).json({mensaje:'Protección de sesión inválida'})
  }
  siguiente()
}

export function ExigirClaveActualizada(req,res,siguiente) {
  if (!req.usuario?.debecambiarclave) return siguiente()
  if (req.path==='/cambiarclave'||req.path==='/salir') return siguiente()
  return res.status(403).json({mensaje:'Debe cambiar su contraseña'})
}

export function Validar(esquema) {
  return (req,res,siguiente)=>{
    const resultado=esquema.safeParse(req.body)
    if (!resultado.success) {
      return res.status(400).json({
        mensaje:'Datos inválidos',
        errores:resultado.error.issues.map(item=>({campo:item.path.join('.'),mensaje:item.message}))
      })
    }
    req.body=resultado.data
    siguiente()
  }
}

export function ValidarIdentificador(req,res,siguiente) {
  if (!/^\d{1,10}$/.test(req.params.id||'')) return res.status(400).json({mensaje:'Identificador inválido'})
  req.params.id=Number(req.params.id)
  siguiente()
}

export function VerificarOrigen(req,res,siguiente) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return siguiente()
  const sitio=req.get('Sec-Fetch-Site')
  if (sitio&&!['same-origin','none'].includes(sitio)) return res.status(403).json({mensaje:'Origen no permitido'})
  const origen=req.get('Origin')
  if (!origen) return siguiente()
  try {
    if (new URL(origen).host!==req.get('Host')) return res.status(403).json({mensaje:'Origen no permitido'})
  } catch {
    return res.status(403).json({mensaje:'Origen no permitido'})
  }
  siguiente()
}

export function ExigirJson(req,res,siguiente) {
  if (!['POST','PUT','PATCH'].includes(req.method)||req.path.endsWith('/salir')) return siguiente()
  if (!req.is('application/json')) return res.status(415).json({mensaje:'Se requiere JSON'})
  siguiente()
}