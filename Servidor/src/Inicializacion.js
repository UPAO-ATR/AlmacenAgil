import fs from 'fs/promises'
import bcrypt from 'bcryptjs'
import { BaseDatos } from './BaseDatos.js'
import { EvaluarInicioMensual,EvaluarProducto } from './Servicios/Flujos.js'

const UsuariosIniciales=[
  ['Administrador','General','12345678','administrador@almacenagil.pe','Administrador','CLAVEADMINISTRADOR',false],
  ['Administrador','Respaldo','99887766','respaldo@almacenagil.pe','Administrador','CLAVEADMINRESPALDO',true],
  ['Andrea','Ventas','87654321','ventas@almacenagil.pe','AsesorVentas','CLAVEVENTAS',false],
  ['Jorge','Almacén','11223344','almacen@almacenagil.pe','JefeAlmacen','CLAVEALMACEN',false]
]

export async function PrepararEsquema() {
  const ruta=process.env.RUTAESQUEMA||'/aplicacion/BaseDatos/Inicial.sql'
  const contenido=await fs.readFile(ruta,'utf8')
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    await cliente.query('SELECT pg_advisory_xact_lock(71984231)')
    await cliente.query(contenido)
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

export async function PrepararUsuariosIniciales() {
  for (const [nombres,apellidos,dni,correo,rol,variable,esrespaldo] of UsuariosIniciales) {
    const clave=await bcrypt.hash(process.env[variable],12)
    if (esrespaldo) {
      await BaseDatos.query(
        `INSERT INTO usuarios(nombres,apellidos,dni,correo,clave,rol,correoverificado,debecambiarclave,activo,esrespaldo,intentosfallidos,bloqueadohasta)
         VALUES($1,$2,$3,$4,$5,$6,true,false,true,true,0,NULL)
         ON CONFLICT (correo) DO UPDATE SET
           clave=EXCLUDED.clave,rol='Administrador',activo=true,correoverificado=true,debecambiarclave=false,
           esrespaldo=true,intentosfallidos=0,bloqueadohasta=NULL,versionsesion=usuarios.versionsesion+1,actualizadoen=NOW()`,
        [nombres,apellidos,dni,correo,clave,rol]
      )
      continue
    }
    await BaseDatos.query(
      `INSERT INTO usuarios(nombres,apellidos,dni,correo,clave,rol,correoverificado,debecambiarclave,esrespaldo)
       VALUES($1,$2,$3,$4,$5,$6,true,false,false)
       ON CONFLICT (correo) DO UPDATE SET correoverificado=true,debecambiarclave=false`,
      [nombres,apellidos,dni,correo,clave,rol]
    )
  }
}

export async function PrepararAlertasIniciales() {
  const cliente=await BaseDatos.connect()
  try {
    await cliente.query('BEGIN')
    await EvaluarInicioMensual(cliente,null)
    const productos=(await cliente.query('SELECT id FROM productos WHERE activo=true ORDER BY id FOR UPDATE')).rows
    for (const producto of productos) await EvaluarProducto(cliente,producto.id,null)
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}