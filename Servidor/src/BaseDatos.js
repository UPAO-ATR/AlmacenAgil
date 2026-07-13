import pg from 'pg'

const { Pool } = pg

export const BaseDatos = new Pool({
  connectionString: process.env.URLBASE,
  max: Number(process.env.CONEXIONESBASE||5),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 12000
})

BaseDatos.on('error', error => console.error('Error de base de datos', error.message))