import pg from 'pg'

const { Pool } = pg

function PrepararConexion(valor) {
  try {
    const url=new URL(valor)
    if (url.hostname.endsWith('.neon.tech')) url.searchParams.set('sslmode','verify-full')
    return url.toString()
  } catch {
    return valor
  }
}

export const BaseDatos = new Pool({
  connectionString:PrepararConexion(process.env.URLBASE),
  max:Number(process.env.CONEXIONESBASE||5),
  idleTimeoutMillis:10000,
  connectionTimeoutMillis:5000,
  statement_timeout:10000,
  query_timeout:12000
})

BaseDatos.on('error',error=>console.error('Error de base de datos',error.message))